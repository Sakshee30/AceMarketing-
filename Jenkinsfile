pipeline {
  agent any

  options {
    timestamps()
    ansiColor('xterm')
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
    timeout(time: 90, unit: 'MINUTES')
  }

  parameters {
    booleanParam(name: 'RUN_DOCKER_ACCEPTANCE', defaultValue: true, description: 'Build and boot the production-like Docker stack and run API smoke checks.')
    booleanParam(name: 'RUN_LOAD', defaultValue: false, description: 'Run the k6 qualification workload when k6 is installed on the Jenkins agent.')
    booleanParam(name: 'RUN_SOAK', defaultValue: false, description: 'Run the longer Playwright soak suite.')
    choice(name: 'DEPLOYMENT_MODE', choices: ['core', 'standard', 'full'], description: 'AceMarketing deployment mode for Docker acceptance.')
  }

  environment {
    CI = 'true'
    NODE_ENV = 'test'
    PLAYWRIGHT_JUNIT_OUTPUT_NAME = 'artifacts/jenkins/playwright-junit.xml'
    POSTGRES_DB = 'acemarketing_ci'
    POSTGRES_USER = 'ace_ci'
    POSTGRES_PASSWORD = 'ace_ci_only_not_for_production'
    ACE_HTTP_PORT = '18080'
    ACE_CONTROL_HTTP_PORT = '18081'
    ACE_DEPLOYMENT_MODE = "${params.DEPLOYMENT_MODE}"
    SMOKE_BASE_URL = 'http://127.0.0.1:18080'
  }

  stages {
    stage('Toolchain preflight') {
      steps {
        sh '''
          set -eux
          node --version
          npm --version
          python3 --version
          git --version
          docker --version || true
          docker compose version || true
          mkdir -p artifacts/jenkins test-data/generated
        '''
      }
    }

    stage('Install Node dependencies') {
      steps {
        sh 'npm ci'
      }
    }

    stage('Generate realistic dummy data') {
      steps {
        sh '''
          node scripts/ci/generate-real-world-fixtures.mjs
          node --test tests/acceptance/real-world-dataset.test.mjs
        '''
      }
    }

    stage('Static + architecture gates') {
      parallel {
        stage('Backend contracts and architecture') {
          steps {
            sh 'npm run contracts:check'
            sh 'npm run backend:architecture'
            sh 'npm run check:backend'
          }
        }
        stage('Frontend typecheck/build') {
          steps {
            sh 'npm run frontends:verify'
          }
        }
        stage('Dependency security') {
          steps {
            sh 'npm run security:audit'
          }
        }
      }
    }

    stage('Backend automated tests') {
      steps {
        sh 'npm run test:backend-foundation'
        sh 'npm run test:ai-backend'
        sh 'npm run backend:operations'
      }
    }

    stage('ML service tests') {
      steps {
        sh '''
          python3 -m venv .venv-jenkins
          . .venv-jenkins/bin/activate
          python -m pip install --upgrade pip
          python -m pip install -e "./ml-service[test]"
          pytest -q ml-service/tests --junitxml=artifacts/jenkins/ml-pytest.xml
        '''
      }
      post {
        always {
          junit allowEmptyResults: true, testResults: 'artifacts/jenkins/ml-pytest.xml'
        }
      }
    }

    stage('Browser E2E') {
      steps {
        sh '''
          npx playwright install --with-deps chromium
          npx playwright test --reporter=line,junit
        '''
      }
      post {
        always {
          archiveArtifacts allowEmptyArchive: true, artifacts: 'playwright-report/**,test-results/**'
          junit allowEmptyResults: true, testResults: 'artifacts/jenkins/playwright-junit.xml'
        }
      }
    }

    stage('Docker production-like acceptance') {
      when {
        expression { return params.RUN_DOCKER_ACCEPTANCE }
      }
      steps {
        sh '''
          set -eux
          cat > .env <<EOF
POSTGRES_DB=${POSTGRES_DB}
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
ACE_DEPLOYMENT_MODE=${ACE_DEPLOYMENT_MODE}
ACE_HTTP_PORT=${ACE_HTTP_PORT}
ACE_CONTROL_HTTP_PORT=${ACE_CONTROL_HTTP_PORT}
NODE_ENV=production
ALLOW_FILE_STORE_IN_PRODUCTION=false
EOF

          docker compose config > artifacts/jenkins/docker-compose-resolved.yml
          docker compose down -v --remove-orphans || true
          docker compose up -d --build postgres migrate preflight api worker web

          node scripts/ci/wait-for-url.mjs http://127.0.0.1:${ACE_HTTP_PORT}/api/health 180
          SMOKE_BASE_URL=http://127.0.0.1:${ACE_HTTP_PORT} npm run smoke

          docker compose ps > artifacts/jenkins/docker-compose-ps.txt
          docker compose logs --no-color > artifacts/jenkins/docker-compose.log
        '''
      }
      post {
        always {
          sh 'docker compose logs --no-color > artifacts/jenkins/docker-compose-final.log 2>&1 || true'
          sh 'docker compose down -v --remove-orphans || true'
          archiveArtifacts allowEmptyArchive: true, artifacts: 'artifacts/jenkins/docker-compose*.{log,txt,yml}'
        }
      }
    }

    stage('Load qualification') {
      when {
        expression { return params.RUN_LOAD }
      }
      steps {
        sh '''
          command -v k6
          BASE_URL=http://127.0.0.1:${ACE_HTTP_PORT}           TARGET_RPS=${TARGET_RPS:-100}           TEST_DURATION=${TEST_DURATION:-60s}           WORKSPACE_ID=ws_jenkins_qualification           k6 run --summary-export=artifacts/jenkins/load-summary.json tests/load/core-traffic.js
        '''
      }
    }

    stage('Soak browser session') {
      when {
        expression { return params.RUN_SOAK }
      }
      steps {
        sh 'npm run e2e:soak'
      }
    }

    stage('Final release evidence') {
      steps {
        sh '''
          npm run doctor > artifacts/jenkins/doctor.txt 2>&1 || true
          npm run provider:versions > artifacts/jenkins/provider-versions.txt 2>&1 || true
          git rev-parse HEAD > artifacts/jenkins/git-sha.txt
          git status --short > artifacts/jenkins/git-status.txt
        '''
      }
    }
  }

  post {
    always {
      archiveArtifacts allowEmptyArchive: true, artifacts: 'artifacts/jenkins/**,test-data/generated/**'
      cleanWs(deleteDirs: true, disableDeferredWipeout: true)
    }
  }
}

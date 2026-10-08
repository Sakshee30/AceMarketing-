# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: frontend-protection.spec.ts >> audience builder traps focus, closes with Escape, and protects an open draft
- Location: tests\e2e\frontend-protection.spec.ts:48:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Open monitoring center' })

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - link "Skip to main content" [ref=e3] [cursor=pointer]:
      - /url: "#ace-main-content"
    - generic [ref=e4]:
      - status [ref=e5]: AceMarketing workspace
      - generic [ref=e6]:
        - link "Skip to workspace content" [ref=e7] [cursor=pointer]:
          - /url: "#ace-workspace-main"
        - status [ref=e8]: Audiences · AceMarketing Production
        - complementary "Workspace navigation" [ref=e9]:
          - generic [ref=e10]: AceMarketing
          - button "AM AceMarketing Production Workspace environment" [ref=e17] [cursor=pointer]:
            - generic [ref=e18]: AM
            - generic [ref=e19]:
              - generic [ref=e20]: AceMarketing Production
              - generic [ref=e21]: Workspace environment
          - navigation "Workspace navigation" [ref=e22]:
            - textbox "Find feature..." [ref=e27]
            - button "Workspace 3" [ref=e29] [cursor=pointer]:
              - generic [ref=e33]: Workspace
              - generic [ref=e34]: "3"
            - button "Tracking & Data 19" [ref=e38] [cursor=pointer]:
              - generic [ref=e44]: Tracking & Data
              - generic [ref=e45]: "19"
            - button "Measurement & Intelligence 9" [ref=e49] [cursor=pointer]:
              - generic [ref=e53]: Measurement & Intelligence
              - generic [ref=e54]: "9"
            - button "Lead & Conversion 12" [ref=e58] [cursor=pointer]:
              - generic [ref=e63]: Lead & Conversion
              - generic [ref=e64]: "12"
            - generic [ref=e67]:
              - button "Activation & Integrations 7" [expanded] [ref=e68] [cursor=pointer]:
                - generic [ref=e76]: Activation & Integrations
                - generic [ref=e77]: "7"
              - generic [ref=e80]:
                - button "Integrations" [ref=e81] [cursor=pointer]
                - button "Data Flows" [ref=e88] [cursor=pointer]
                - button "Real-Time Activation" [ref=e94] [cursor=pointer]
                - button "Personalization" [ref=e97] [cursor=pointer]
                - button "Exclusions" [ref=e100] [cursor=pointer]
                - button "Audiences" [ref=e104] [cursor=pointer]
                - button "Delivery" [ref=e110] [cursor=pointer]
            - button "Operations & Developer 5" [ref=e119] [cursor=pointer]:
              - generic [ref=e122]: Operations & Developer
              - generic [ref=e123]: "5"
          - generic [ref=e126]:
            - button "Back to website" [ref=e127] [cursor=pointer]
            - generic [ref=e130]:
              - generic [ref=e131]: O
              - generic [ref=e132]:
                - generic [ref=e133]: owner@example.com
                - generic [ref=e134]: owner
        - main [ref=e135]:
          - generic [ref=e136]:
            - button "Open workspace navigation" [ref=e137] [cursor=pointer]
            - textbox "Search journeys, leads, campaigns, settings..." [ref=e143]
            - generic [ref=e144]:
              - button "Support" [ref=e145] [cursor=pointer]
              - button "Region and language" [ref=e148] [cursor=pointer]
              - generic [ref=e154]: O
          - generic "Dashboard sections" [ref=e155]:
            - button "Workspace" [ref=e156] [cursor=pointer]:
              - generic [ref=e161]:
                - generic [aria-hidden] [ref=e162]: Workspace
                - generic [ref=e163]: Ready
            - button "Tracking & Data" [ref=e165] [cursor=pointer]:
              - generic [ref=e172]:
                - generic [aria-hidden] [ref=e173]: Tracking & Data
                - generic [ref=e174]: Ready
            - button "Measurement & Intelligence" [ref=e176] [cursor=pointer]:
              - generic [ref=e181]:
                - generic [aria-hidden] [ref=e182]: Measurement & Intelligence
                - generic [ref=e183]: Needs setup
            - button "Lead & Conversion" [ref=e185] [cursor=pointer]:
              - generic [ref=e191]:
                - generic [aria-hidden] [ref=e192]: Lead & Conversion
                - generic [ref=e193]: Needs setup
            - button "Activation & Integrations" [ref=e195] [cursor=pointer]:
              - generic [ref=e204]:
                - generic [aria-hidden] [ref=e205]: Activation & Integrations
                - generic [ref=e206]: Ready
            - button "Operations & Developer" [ref=e208] [cursor=pointer]:
              - generic [ref=e212]:
                - generic [aria-hidden] [ref=e213]: Operations & Developer
                - generic [ref=e214]: Needs setup
          - generic [ref=e216]:
            - generic [ref=e218]:
              - generic [ref=e219]: Activation / Audiences
              - heading "Audience management" [level=1] [ref=e220]
              - paragraph [ref=e221]: Activate high-intent first-party segments and suppress converted, low-quality or device-identified users.
            - generic [ref=e222]:
              - article [ref=e223]:
                - generic [ref=e224]: Audience records
                - strong [ref=e230]: "0"
                - text: 0 provider-active
              - article [ref=e231]:
                - generic [ref=e232]: Activated identities
                - strong [ref=e238]: "0"
                - text: Materialized non-suppression members
              - article [ref=e239]:
                - generic [ref=e240]: Suppressed identities
                - strong [ref=e245]: "0"
                - text: Materialized suppression members
              - article [ref=e246]:
                - generic [ref=e247]: Observed sync latency
                - strong [ref=e251]: —
                - text: From persisted successful sync timestamps
            - generic [ref=e252]:
              - generic [ref=e253]:
                - generic [ref=e254]:
                  - heading "Active segments" [level=3] [ref=e255]
                  - paragraph [ref=e256]: Materialized from persisted lead/device profiles; provider sync state is explicit
                - generic [ref=e257]:
                  - button "Export" [ref=e258] [cursor=pointer]
                  - button "New audience" [ref=e259] [cursor=pointer]
              - generic [ref=e266]:
                - generic [ref=e267]: No audiences yet
                - generic [ref=e268]: Create a first-party audience from persisted lead, journey or device identity.
            - generic [ref=e269]:
              - generic [ref=e270]:
                - generic [ref=e272]:
                  - heading "Lifecycle audiences" [level=3] [ref=e273]
                  - paragraph [ref=e274]: Derived from persisted CRM/lead stages · click a row to preview the real segment
                - button "Acquisition New / active prospects 0 identities Retarget" [ref=e275] [cursor=pointer]:
                  - generic [ref=e276]: Acquisition
                  - generic [ref=e277]:
                    - generic [ref=e278]: New / active prospects
                    - generic [ref=e279]: 0 identities
                  - emphasis [ref=e280]: Retarget
                - button "Nurture Lead / contacted / connected 0 identities Retarget" [ref=e283] [cursor=pointer]:
                  - generic [ref=e284]: Nurture
                  - generic [ref=e285]:
                    - generic [ref=e286]: Lead / contacted / connected
                    - generic [ref=e287]: 0 identities
                  - emphasis [ref=e288]: Retarget
                - button "Decision Qualified / consultation / opportunity 0 identities Lookalike seed" [ref=e291] [cursor=pointer]:
                  - generic [ref=e292]: Decision
                  - generic [ref=e293]:
                    - generic [ref=e294]: Qualified / consultation / opportunity
                    - generic [ref=e295]: 0 identities
                  - emphasis [ref=e296]: Lookalike seed
                - button "Post-purchase Converted / enrolled / closed won 0 identities Suppress" [ref=e299] [cursor=pointer]:
                  - generic [ref=e300]: Post-purchase
                  - generic [ref=e301]:
                    - generic [ref=e302]: Converted / enrolled / closed won
                    - generic [ref=e303]: 0 identities
                  - emphasis [ref=e304]: Suppress
              - generic [ref=e307]:
                - generic [ref=e309]:
                  - heading "Waste-control identity pool" [level=3] [ref=e310]
                  - paragraph [ref=e311]: Turn observed waste pools into persisted suppression/retargeting audiences
                - button "Converted customers Customer ID + hashed PII 0 Suppress" [ref=e312] [cursor=pointer]:
                  - generic [ref=e316]:
                    - generic [ref=e317]: Converted customers
                    - generic [ref=e318]: Customer ID + hashed PII
                  - strong [ref=e319]: "0"
                  - generic [ref=e320]: Suppress
                - button "Device-ID identities First-party mobile advertising IDs 0 Retarget" [ref=e321] [cursor=pointer]:
                  - generic [ref=e325]:
                    - generic [ref=e326]: Device-ID identities
                    - generic [ref=e327]: First-party mobile advertising IDs
                  - strong [ref=e328]: "0"
                  - generic [ref=e329]: Retarget
                - button "Low-quality leads Lead grade C / D 0 Suppress" [ref=e330] [cursor=pointer]:
                  - generic [ref=e334]:
                    - generic [ref=e335]: Low-quality leads
                    - generic [ref=e336]: Lead grade C / D
                  - strong [ref=e337]: "0"
                  - generic [ref=e338]: Suppress
            - generic [ref=e339]:
              - generic [ref=e340]:
                - generic [ref=e342]:
                  - heading "Audience signals" [level=3] [ref=e343]
                  - paragraph [ref=e344]: First-party attributes available to the builder
                - generic [ref=e345]:
                  - generic [ref=e346]: Lead grade
                  - generic [ref=e347]: CRM stage
                  - generic [ref=e348]: Conversion propensity
                  - generic [ref=e349]: Pricing-page views
                  - generic [ref=e350]: LTV tier
                  - generic [ref=e351]: Last activity
                  - generic [ref=e352]: Device ID present
                  - generic [ref=e353]: Device platform
                  - generic [ref=e354]: App ID
              - generic [ref=e355]:
                - generic [ref=e357]:
                  - heading "Activation guardrails" [level=3] [ref=e358]
                  - paragraph [ref=e359]: Provider sync checks consent again before data leaves AceMarketing
                - generic [ref=e360]:
                  - generic [ref=e361]: Marketing consent
                  - generic [ref=e364]: Required for every member
                - generic [ref=e365]:
                  - generic [ref=e366]: Device audience
                  - generic [ref=e369]: Mobile advertising ID + app context
                - generic [ref=e370]:
                  - generic [ref=e371]: Converted customer
                  - generic [ref=e374]: Suppress acquisition
                - generic [ref=e375]:
                  - generic [ref=e376]: Low quality / invalid
                  - generic [ref=e379]: Suppress optimization
                - generic [ref=e380]:
                  - generic [ref=e381]: High-value prospect
                  - generic [ref=e384]: Seed / optimize
            - dialog "Audience Builder" [ref=e385]:
              - generic [ref=e386]:
                - generic [ref=e387]:
                  - generic [ref=e393]:
                    - generic [ref=e394]: Audience Builder
                    - generic [ref=e395]: Create a first-party segment from journey, CRM or device evidence
                  - button [ref=e396] [cursor=pointer]
                - generic [ref=e400]:
                  - text: Audience name
                  - textbox "Audience name" [active] [ref=e401]: High-intent prospects
                - generic [ref=e402]:
                  - generic [ref=e403]:
                    - text: Condition
                    - combobox "Condition" [ref=e404]:
                      - option "Lead grade" [selected]
                      - option "Conversion propensity"
                      - option "CRM stage"
                      - option "Pricing-page views"
                      - option "LTV tier"
                      - option "Last activity"
                      - option "Device ID present"
                      - option "Device platform"
                      - option "App ID"
                  - generic [ref=e405]:
                    - text: Operator
                    - combobox "Operator" [ref=e406]:
                      - option "is" [selected]
                      - option "is one of"
                      - option "is greater than"
                      - option "is less than"
                      - option "contains"
                  - generic [ref=e407]:
                    - text: Value
                    - textbox "Value" [ref=e408]: A
                - generic [ref=e409]:
                  - text: Identity key
                  - combobox "Identity key" [ref=e410]:
                    - option "Auto · contact first, device fallback" [selected]
                    - option "Contact info · hashed email / phone"
                    - option "Mobile advertising ID"
                - generic [ref=e411]:
                  - text: Destination
                  - combobox "Destination" [ref=e412]:
                    - option "Google Ads · Meta Ads" [selected]
                    - option "Google Ads"
                    - option "Meta Ads"
                - generic [ref=e413]:
                  - text: Mode
                  - combobox "Mode" [ref=e414]:
                    - option "Activate" [selected]
                    - option "Suppress"
                    - option "Retarget"
                    - option "Lookalike seed"
                - generic [ref=e415]:
                  - button "Cancel" [ref=e416] [cursor=pointer]
                  - button "Preview audience" [ref=e417] [cursor=pointer]
    - button "Open dashboard section navigator" [ref=e419] [cursor=pointer]:
      - generic [ref=e421]: Dashboard navigator
  - button "Manage privacy choices" [ref=e424] [cursor=pointer]: Privacy
```

# Test source

```ts
  1   | import {expect,test} from '@playwright/test'
  2   | 
  3   | test.beforeEach(async({page,context},testInfo)=>{
  4   |   const raw=['frontend_guard',testInfo.project.name,testInfo.workerIndex,testInfo.parallelIndex].join('_').toLowerCase().replace(/[^a-z0-9_-]+/g,'_')
  5   |   const workspaceId=raw.slice(0,60)
  6   |   await context.setExtraHTTPHeaders({'X-Workspace-ID':workspaceId})
  7   |   await page.addInitScript((id)=>window.localStorage.setItem('ace_workspace_id',id),workspaceId)
  8   | })
  9   | 
  10  | const dismissConsent=async(page:any)=>{
  11  |   const dialog=page.getByRole('dialog',{name:'Privacy choices'})
  12  |   if(await dialog.isVisible().catch(()=>false)){
  13  |     await dialog.getByRole('button',{name:'Essential only'}).click()
  14  |     await expect(dialog).toHaveCount(0)
  15  |   }
  16  | }
  17  | 
  18  | test('workspace tab route is direct-linkable and dirty settings require explicit discard',async({page})=>{
  19  |   await page.goto('/#/workspace?tab=Settings')
  20  |   await dismissConsent(page)
  21  |   await expect(page).toHaveURL(/#\/workspace\?tab=Settings/)
  22  |   await expect(page.getByRole('heading',{name:'Workspace settings'})).toBeVisible()
  23  | 
  24  |   const organization=page.getByLabel('Organization')
  25  |   const previous=await organization.inputValue()
  26  |   await organization.fill(previous+' CI unsaved')
  27  |   await expect(page.getByText(/unsaved setting/i)).toBeVisible()
  28  | 
  29  |   page.once('dialog',async dialog=>{
  30  |     expect(dialog.type()).toBe('confirm')
  31  |     expect(dialog.message()).toContain('unsaved work')
  32  |     await dialog.dismiss()
  33  |   })
  34  |   await page.getByRole('button',{name:'Open monitoring center'}).click()
  35  |   await expect(page.getByRole('heading',{name:'Workspace settings'})).toBeVisible()
  36  |   await expect(page).toHaveURL(/tab=Settings/)
  37  | 
  38  |   page.once('dialog',async dialog=>{
  39  |     expect(dialog.type()).toBe('confirm')
  40  |     await dialog.accept()
  41  |   })
  42  |   await page.getByRole('button',{name:'Open monitoring center'}).click()
  43  |   await expect(page.getByRole('heading',{name:'Platform monitoring',exact:true})).toBeVisible()
  44  |   await expect(page).toHaveURL(/tab=Monitoring/)
  45  | })
  46  | 
  47  | 
  48  | test('audience builder traps focus, closes with Escape, and protects an open draft',async({page})=>{
  49  |   await page.goto('/#/workspace?tab=Audiences')
  50  |   await dismissConsent(page)
  51  |   await expect(page.getByRole('heading',{name:'Audience management'})).toBeVisible()
  52  | 
  53  |   await page.getByRole('button',{name:/New audience/i}).click()
  54  |   const dialog=page.getByRole('dialog',{name:'Audience Builder'})
  55  |   await expect(dialog).toBeVisible()
  56  |   await expect(dialog.getByLabel('Audience name')).toBeFocused()
  57  | 
  58  |   page.once('dialog',async confirm=>{
  59  |     expect(confirm.type()).toBe('confirm')
  60  |     expect(confirm.message()).toContain('unsaved work')
  61  |     await confirm.dismiss()
  62  |   })
> 63  |   await page.getByRole('button',{name:'Open monitoring center'}).click()
      |                                                                  ^ Error: locator.click: Test timeout of 30000ms exceeded.
  64  |   await expect(dialog).toBeVisible()
  65  | 
  66  |   await page.keyboard.press('Escape')
  67  |   await expect(dialog).toHaveCount(0)
  68  |   await expect(page.getByRole('button',{name:/New audience/i})).toBeFocused()
  69  | })
  70  | 
  71  | 
  72  | test('reports browser offline state without polling or hiding current UI',async({page,context})=>{
  73  |   await page.goto('/#/workspace?tab=Overview')
  74  |   await dismissConsent(page)
  75  |   await expect(page.getByRole('heading',{name:/Acquisition command center/i})).toBeVisible()
  76  |   await context.setOffline(true)
  77  |   await page.evaluate(()=>window.dispatchEvent(new Event('offline')))
  78  |   const status=page.getByTestId('connection-status')
  79  |   await expect(status).toBeVisible()
  80  |   await expect(status).toContainText(/appear to be offline/i)
  81  |   await expect(page.getByRole('heading',{name:/Acquisition command center/i})).toBeVisible()
  82  |   await context.setOffline(false)
  83  | })
  84  | 
  85  | 
  86  | test('shows controlled recovery for missing lazy chunks without automatic reload',async({page})=>{
  87  |   await page.goto('/#/workspace?tab=Overview')
  88  |   await dismissConsent(page)
  89  |   await page.evaluate(()=>window.dispatchEvent(new Event('vite:preloadError',{cancelable:true})))
  90  |   const notice=page.getByTestId('chunk-recovery')
  91  |   await expect(notice).toBeVisible()
  92  |   await expect(notice).toContainText(/controlled refresh/i)
  93  |   await expect(notice).toContainText(/will not reload automatically/i)
  94  |   await page.getByRole('button',{name:'Keep working'}).click()
  95  |   await expect(notice).toHaveCount(0)
  96  |   await expect(page.getByRole('heading',{name:/Acquisition command center/i})).toBeVisible()
  97  | })
  98  | 
  99  | 
  100 | test('loads extracted approvals feature from its direct workspace route',async({page})=>{
  101 |   await page.goto('/#/workspace?tab=Approvals')
  102 |   await dismissConsent(page)
  103 |   await expect(page).toHaveURL(/#\/workspace\?tab=Approvals/)
  104 |   await expect(page.getByRole('heading',{name:'Human approval center'})).toBeVisible()
  105 |   await expect(page.getByText(/Persisted agent and automation requests/i)).toBeVisible()
  106 | })
  107 | 
  108 | 
  109 | test('loads extracted monitoring feature from its direct workspace route',async({page})=>{
  110 |   await page.goto('/#/workspace?tab=Monitoring')
  111 |   await dismissConsent(page)
  112 |   await expect(page).toHaveURL(/#\/workspace\?tab=Monitoring/)
  113 |   await expect(page.getByRole('heading',{name:'Platform monitoring'})).toBeVisible()
  114 |   await expect(page.getByText(/24-hour API health/i)).toBeVisible()
  115 | })
  116 | 
  117 | 
  118 | test('loads extracted alerts feature from its direct workspace route',async({page})=>{
  119 |   await page.goto('/#/workspace?tab=Alerts')
  120 |   await dismissConsent(page)
  121 |   await expect(page).toHaveURL(/#\/workspace\?tab=Alerts/)
  122 |   await expect(page.getByRole('heading',{name:'Alert Center'})).toBeVisible()
  123 |   await expect(page.getByText(/Operational incidents/i)).toBeVisible()
  124 | })
  125 | 
  126 | 
  127 | test('loads extracted reports feature from its direct workspace route',async({page})=>{
  128 |   await page.goto('/#/workspace?tab=Reports')
  129 |   await dismissConsent(page)
  130 |   await expect(page).toHaveURL(/#\/workspace\?tab=Reports/)
  131 |   await expect(page.getByRole('heading',{name:'Cohort & automated reports'})).toBeVisible()
  132 |   await expect(page.getByText(/Automated email reports/i)).toBeVisible()
  133 | })
  134 | 
  135 | 
  136 | test('loads extracted executive briefs feature from its direct workspace route',async({page})=>{
  137 |   await page.goto('/#/workspace?tab=Executive%20Briefs')
  138 |   await dismissConsent(page)
  139 |   await expect(page).toHaveURL(/#\/workspace\?tab=Executive%20Briefs/)
  140 |   await expect(page.getByRole('heading',{name:'Executive data snippets'})).toBeVisible()
  141 |   await expect(page.getByText(/Schedule executive brief/i)).toBeVisible()
  142 | })
  143 | 
  144 | 
  145 | test('loads extracted integrations feature from its direct workspace route',async({page})=>{
  146 |   await page.goto('/#/workspace?tab=Integrations')
  147 |   await dismissConsent(page)
  148 |   await expect(page).toHaveURL(/#\/workspace\?tab=Integrations/)
  149 |   await expect(page.getByRole('heading',{name:'Platform-agnostic connectivity'})).toBeVisible()
  150 |   await expect(page.getByText(/Integration catalog/i)).toBeVisible()
  151 | })
  152 | 
  153 | 
  154 | test('loads extracted data flows feature from its direct workspace route',async({page})=>{
  155 |   await page.goto('/#/workspace?tab=Data%20Flows')
  156 |   await dismissConsent(page)
  157 |   await expect(page).toHaveURL(/#\/workspace\?tab=Data%20Flows/)
  158 |   await expect(page.getByRole('heading',{name:'Data flows'})).toBeVisible()
  159 |   await expect(page.getByText(/Source → map → verify → activate/i)).toBeVisible()
  160 | })
  161 | 
  162 | test('loads extracted audiences feature from its direct workspace route',async({page})=>{
  163 |   await page.goto('/#/workspace?tab=Audiences')
```
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
    - locator resolved to <button class="sync sync-button" aria-label="Open monitoring center">● Monitoring</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div role="dialog" tabindex="-1" aria-modal="true" class="connector-modal" aria-label="Audience Builder">…</div> from <div class="product-body">…</div> subtree intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div role="dialog" tabindex="-1" aria-modal="true" class="connector-modal" aria-label="Audience Builder">…</div> from <div class="product-body">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 100ms
    60 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div role="dialog" tabindex="-1" aria-modal="true" class="connector-modal" aria-label="Audience Builder">…</div> from <div class="product-body">…</div> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms

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
          - navigation "Workspace navigation" [ref=e24]:
            - textbox "Find feature..." [ref=e29]
            - button "Workspace 3" [ref=e31] [cursor=pointer]:
              - generic [ref=e35]: Workspace
              - generic [ref=e36]: "3"
            - button "Tracking & Data 19" [ref=e40] [cursor=pointer]:
              - generic [ref=e46]: Tracking & Data
              - generic [ref=e47]: "19"
            - button "Measurement & Intelligence 9" [ref=e51] [cursor=pointer]:
              - generic [ref=e55]: Measurement & Intelligence
              - generic [ref=e56]: "9"
            - button "Lead & Conversion 12" [ref=e60] [cursor=pointer]:
              - generic [ref=e65]: Lead & Conversion
              - generic [ref=e66]: "12"
            - generic [ref=e69]:
              - button "Activation & Integrations 7" [expanded] [ref=e70] [cursor=pointer]:
                - generic [ref=e78]: Activation & Integrations
                - generic [ref=e79]: "7"
              - generic [ref=e82]:
                - button "Integrations" [ref=e83] [cursor=pointer]
                - button "Data Flows" [ref=e90] [cursor=pointer]
                - button "Real-Time Activation" [ref=e96] [cursor=pointer]
                - button "Personalization" [ref=e99] [cursor=pointer]
                - button "Exclusions" [ref=e102] [cursor=pointer]
                - button "Audiences" [ref=e106] [cursor=pointer]
                - button "Delivery" [ref=e112] [cursor=pointer]
            - button "Operations & Developer 5" [ref=e121] [cursor=pointer]:
              - generic [ref=e124]: Operations & Developer
              - generic [ref=e125]: "5"
          - generic [ref=e128]:
            - button "Back to website" [ref=e129] [cursor=pointer]
            - generic [ref=e132]:
              - generic [ref=e133]: O
              - generic [ref=e134]:
                - generic [ref=e135]: owner@example.com
                - generic [ref=e136]: owner
        - main [ref=e137]:
          - generic [ref=e138]:
            - textbox "Search journeys, leads, campaigns, settings..." [ref=e143]
            - generic [ref=e144]:
              - button "Open monitoring center" [ref=e145] [cursor=pointer]: ● Monitoring
              - button "Support" [ref=e146] [cursor=pointer]
              - button "Region and language" [ref=e149] [cursor=pointer]
              - generic [ref=e155]: O
          - generic "Dashboard sections" [ref=e156]:
            - button "Workspace" [ref=e157] [cursor=pointer]:
              - generic [ref=e162]:
                - generic [aria-hidden] [ref=e163]: Workspace
                - generic [ref=e164]: Ready
            - button "Tracking & Data" [ref=e166] [cursor=pointer]:
              - generic [ref=e173]:
                - generic [aria-hidden] [ref=e174]: Tracking & Data
                - generic [ref=e175]: Ready
            - button "Measurement & Intelligence" [ref=e177] [cursor=pointer]:
              - generic [ref=e182]:
                - generic [aria-hidden] [ref=e183]: Measurement & Intelligence
                - generic [ref=e184]: Needs setup
            - button "Lead & Conversion" [ref=e186] [cursor=pointer]:
              - generic [ref=e192]:
                - generic [aria-hidden] [ref=e193]: Lead & Conversion
                - generic [ref=e194]: Needs setup
            - button "Activation & Integrations" [ref=e196] [cursor=pointer]:
              - generic [ref=e205]:
                - generic [aria-hidden] [ref=e206]: Activation & Integrations
                - generic [ref=e207]: Ready
            - button "Operations & Developer" [ref=e209] [cursor=pointer]:
              - generic [ref=e213]:
                - generic [aria-hidden] [ref=e214]: Operations & Developer
                - generic [ref=e215]: Needs setup
          - generic [ref=e217]:
            - generic [ref=e219]:
              - generic [ref=e220]: Activation / Audiences
              - heading "Audience management" [level=1] [ref=e221]
              - paragraph [ref=e222]: Activate high-intent first-party segments and suppress converted, low-quality or device-identified users.
            - generic [ref=e223]:
              - article [ref=e224]:
                - generic [ref=e225]: Audience records
                - strong [ref=e231]: "0"
                - text: 0 provider-active
              - article [ref=e232]:
                - generic [ref=e233]: Activated identities
                - strong [ref=e239]: "0"
                - text: Materialized non-suppression members
              - article [ref=e240]:
                - generic [ref=e241]: Suppressed identities
                - strong [ref=e246]: "0"
                - text: Materialized suppression members
              - article [ref=e247]:
                - generic [ref=e248]: Observed sync latency
                - strong [ref=e252]: —
                - text: From persisted successful sync timestamps
            - generic [ref=e253]:
              - generic [ref=e254]:
                - generic [ref=e255]:
                  - heading "Active segments" [level=3] [ref=e256]
                  - paragraph [ref=e257]: Materialized from persisted lead/device profiles; provider sync state is explicit
                - generic [ref=e258]:
                  - button "Export" [ref=e259] [cursor=pointer]
                  - button "New audience" [ref=e260] [cursor=pointer]
              - generic [ref=e267]:
                - generic [ref=e268]: No audiences yet
                - generic [ref=e269]: Create a first-party audience from persisted lead, journey or device identity.
            - generic [ref=e270]:
              - generic [ref=e271]:
                - generic [ref=e273]:
                  - heading "Lifecycle audiences" [level=3] [ref=e274]
                  - paragraph [ref=e275]: Derived from persisted CRM/lead stages · click a row to preview the real segment
                - button "Acquisition New / active prospects 0 identities Retarget" [ref=e276] [cursor=pointer]:
                  - generic [ref=e277]: Acquisition
                  - generic [ref=e278]:
                    - generic [ref=e279]: New / active prospects
                    - generic [ref=e280]: 0 identities
                  - emphasis [ref=e281]: Retarget
                - button "Nurture Lead / contacted / connected 0 identities Retarget" [ref=e284] [cursor=pointer]:
                  - generic [ref=e285]: Nurture
                  - generic [ref=e286]:
                    - generic [ref=e287]: Lead / contacted / connected
                    - generic [ref=e288]: 0 identities
                  - emphasis [ref=e289]: Retarget
                - button "Decision Qualified / consultation / opportunity 0 identities Lookalike seed" [ref=e292] [cursor=pointer]:
                  - generic [ref=e293]: Decision
                  - generic [ref=e294]:
                    - generic [ref=e295]: Qualified / consultation / opportunity
                    - generic [ref=e296]: 0 identities
                  - emphasis [ref=e297]: Lookalike seed
                - button "Post-purchase Converted / enrolled / closed won 0 identities Suppress" [ref=e300] [cursor=pointer]:
                  - generic [ref=e301]: Post-purchase
                  - generic [ref=e302]:
                    - generic [ref=e303]: Converted / enrolled / closed won
                    - generic [ref=e304]: 0 identities
                  - emphasis [ref=e305]: Suppress
              - generic [ref=e308]:
                - generic [ref=e310]:
                  - heading "Waste-control identity pool" [level=3] [ref=e311]
                  - paragraph [ref=e312]: Turn observed waste pools into persisted suppression/retargeting audiences
                - button "Converted customers Customer ID + hashed PII 0 Suppress" [ref=e313] [cursor=pointer]:
                  - generic [ref=e317]:
                    - generic [ref=e318]: Converted customers
                    - generic [ref=e319]: Customer ID + hashed PII
                  - strong [ref=e320]: "0"
                  - generic [ref=e321]: Suppress
                - button "Device-ID identities First-party mobile advertising IDs 0 Retarget" [ref=e322] [cursor=pointer]:
                  - generic [ref=e326]:
                    - generic [ref=e327]: Device-ID identities
                    - generic [ref=e328]: First-party mobile advertising IDs
                  - strong [ref=e329]: "0"
                  - generic [ref=e330]: Retarget
                - button "Low-quality leads Lead grade C / D 0 Suppress" [ref=e331] [cursor=pointer]:
                  - generic [ref=e335]:
                    - generic [ref=e336]: Low-quality leads
                    - generic [ref=e337]: Lead grade C / D
                  - strong [ref=e338]: "0"
                  - generic [ref=e339]: Suppress
            - generic [ref=e340]:
              - generic [ref=e341]:
                - generic [ref=e343]:
                  - heading "Audience signals" [level=3] [ref=e344]
                  - paragraph [ref=e345]: First-party attributes available to the builder
                - generic [ref=e346]:
                  - generic [ref=e347]: Lead grade
                  - generic [ref=e348]: CRM stage
                  - generic [ref=e349]: Conversion propensity
                  - generic [ref=e350]: Pricing-page views
                  - generic [ref=e351]: LTV tier
                  - generic [ref=e352]: Last activity
                  - generic [ref=e353]: Device ID present
                  - generic [ref=e354]: Device platform
                  - generic [ref=e355]: App ID
              - generic [ref=e356]:
                - generic [ref=e358]:
                  - heading "Activation guardrails" [level=3] [ref=e359]
                  - paragraph [ref=e360]: Provider sync checks consent again before data leaves AceMarketing
                - generic [ref=e361]:
                  - generic [ref=e362]: Marketing consent
                  - generic [ref=e365]: Required for every member
                - generic [ref=e366]:
                  - generic [ref=e367]: Device audience
                  - generic [ref=e370]: Mobile advertising ID + app context
                - generic [ref=e371]:
                  - generic [ref=e372]: Converted customer
                  - generic [ref=e375]: Suppress acquisition
                - generic [ref=e376]:
                  - generic [ref=e377]: Low quality / invalid
                  - generic [ref=e380]: Suppress optimization
                - generic [ref=e381]:
                  - generic [ref=e382]: High-value prospect
                  - generic [ref=e385]: Seed / optimize
            - dialog "Audience Builder" [ref=e386]:
              - generic [ref=e387]:
                - generic [ref=e388]:
                  - generic [ref=e394]:
                    - generic [ref=e395]: Audience Builder
                    - generic [ref=e396]: Create a first-party segment from journey, CRM or device evidence
                  - button [ref=e397] [cursor=pointer]
                - generic [ref=e401]:
                  - text: Audience name
                  - textbox "Audience name" [active] [ref=e402]: High-intent prospects
                - generic [ref=e403]:
                  - generic [ref=e404]:
                    - text: Condition
                    - combobox "Condition" [ref=e405]:
                      - option "Lead grade" [selected]
                      - option "Conversion propensity"
                      - option "CRM stage"
                      - option "Pricing-page views"
                      - option "LTV tier"
                      - option "Last activity"
                      - option "Device ID present"
                      - option "Device platform"
                      - option "App ID"
                  - generic [ref=e406]:
                    - text: Operator
                    - combobox "Operator" [ref=e407]:
                      - option "is" [selected]
                      - option "is one of"
                      - option "is greater than"
                      - option "is less than"
                      - option "contains"
                  - generic [ref=e408]:
                    - text: Value
                    - textbox "Value" [ref=e409]: A
                - generic [ref=e410]:
                  - text: Identity key
                  - combobox "Identity key" [ref=e411]:
                    - option "Auto · contact first, device fallback" [selected]
                    - option "Contact info · hashed email / phone"
                    - option "Mobile advertising ID"
                - generic [ref=e412]:
                  - text: Destination
                  - combobox "Destination" [ref=e413]:
                    - option "Google Ads · Meta Ads" [selected]
                    - option "Google Ads"
                    - option "Meta Ads"
                - generic [ref=e414]:
                  - text: Mode
                  - combobox "Mode" [ref=e415]:
                    - option "Activate" [selected]
                    - option "Suppress"
                    - option "Retarget"
                    - option "Lookalike seed"
                - generic [ref=e416]:
                  - button "Cancel" [ref=e417] [cursor=pointer]
                  - button "Preview audience" [ref=e418] [cursor=pointer]
    - button "Open dashboard section navigator" [ref=e420] [cursor=pointer]:
      - generic [ref=e422]: Dashboard navigator
      - generic [ref=e423]: Ctrl K
  - button "Manage privacy choices" [ref=e426] [cursor=pointer]: Privacy
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
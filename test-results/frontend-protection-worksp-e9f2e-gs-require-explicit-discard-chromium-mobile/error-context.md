# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: frontend-protection.spec.ts >> workspace tab route is direct-linkable and dirty settings require explicit discard
- Location: tests\e2e\frontend-protection.spec.ts:18:1

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
        - status [ref=e8]: Settings · AceMarketing Production
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
            - button "Activation & Integrations 7" [ref=e68] [cursor=pointer]:
              - generic [ref=e76]: Activation & Integrations
              - generic [ref=e77]: "7"
            - generic [ref=e80]:
              - button "Operations & Developer 5" [expanded] [ref=e81] [cursor=pointer]:
                - generic [ref=e84]: Operations & Developer
                - generic [ref=e85]: "5"
              - generic [ref=e88]:
                - button "Monitoring" [ref=e89] [cursor=pointer]
                - button "Alerts" [ref=e92] [cursor=pointer]
                - button "Compliance" [ref=e96] [cursor=pointer]
                - button "Developers" [ref=e100] [cursor=pointer]
                - button "Settings" [ref=e105] [cursor=pointer]
          - generic [ref=e110]:
            - button "Back to website" [ref=e111] [cursor=pointer]
            - generic [ref=e114]:
              - generic [ref=e115]: O
              - generic [ref=e116]:
                - generic [ref=e117]: owner@example.com
                - generic [ref=e118]: owner
        - main [ref=e119]:
          - generic [ref=e120]:
            - button "Open workspace navigation" [ref=e121] [cursor=pointer]
            - textbox "Search journeys, leads, campaigns, settings..." [ref=e127]
            - generic [ref=e128]:
              - button "Support" [ref=e129] [cursor=pointer]
              - button "Region and language" [ref=e132] [cursor=pointer]
              - generic [ref=e138]: O
          - generic "Dashboard sections" [ref=e139]:
            - button "Workspace" [ref=e140] [cursor=pointer]:
              - generic [ref=e145]:
                - generic [aria-hidden] [ref=e146]: Workspace
                - generic [ref=e147]: Ready
            - button "Tracking & Data" [ref=e149] [cursor=pointer]:
              - generic [ref=e156]:
                - generic [aria-hidden] [ref=e157]: Tracking & Data
                - generic [ref=e158]: Ready
            - button "Measurement & Intelligence" [ref=e160] [cursor=pointer]:
              - generic [ref=e165]:
                - generic [aria-hidden] [ref=e166]: Measurement & Intelligence
                - generic [ref=e167]: Needs setup
            - button "Lead & Conversion" [ref=e169] [cursor=pointer]:
              - generic [ref=e175]:
                - generic [aria-hidden] [ref=e176]: Lead & Conversion
                - generic [ref=e177]: Needs setup
            - button "Activation & Integrations" [ref=e179] [cursor=pointer]:
              - generic [ref=e188]:
                - generic [aria-hidden] [ref=e189]: Activation & Integrations
                - generic [ref=e190]: Ready
            - button "Operations & Developer" [ref=e192] [cursor=pointer]:
              - generic [ref=e196]:
                - generic [aria-hidden] [ref=e197]: Operations & Developer
                - generic [ref=e198]: Needs setup
          - generic [ref=e200]:
            - generic [ref=e202]:
              - generic [ref=e203]: Workspace / Settings
              - heading "Workspace settings" [level=1] [ref=e204]
              - paragraph [ref=e205]: Configure organization, access, tracking, governance, developer access and automation boundaries.
            - generic [ref=e206]: 1 unsaved setting · save or explicitly leave this page to discard them.
            - generic [ref=e210]:
              - complementary [ref=e211]:
                - button "Workspace" [ref=e212] [cursor=pointer]
                - button "Users & roles" [ref=e215] [cursor=pointer]
                - button "Tracking" [ref=e218] [cursor=pointer]
                - button "Governance" [ref=e221] [cursor=pointer]
                - button "API & webhooks" [ref=e224] [cursor=pointer]
                - button "Agent approvals" [ref=e227] [cursor=pointer]
                - button "Notifications" [ref=e230] [cursor=pointer]
                - button "Billing & usage" [ref=e233] [cursor=pointer]
              - generic [ref=e237]:
                - heading "Workspace profile" [level=3] [ref=e238]
                - paragraph [ref=e239]: These values are persisted for this workspace and used by reporting and operational views.
                - generic [ref=e240]:
                  - generic [ref=e241]:
                    - generic [ref=e242]: Organization
                    - textbox "Organization" [active] [ref=e243]: Ace EdTech CI unsaved
                  - generic [ref=e244]:
                    - generic [ref=e245]: Timezone
                    - textbox "Timezone" [ref=e246]: Asia/Kolkata
                  - generic [ref=e247]:
                    - generic [ref=e248]: Currency
                    - textbox "Currency" [ref=e249]: INR
                  - generic [ref=e250]:
                    - generic [ref=e251]: Reporting week
                    - textbox "Reporting week" [ref=e252]: Monday
                  - generic [ref=e253]:
                    - generic [ref=e254]: Default attribution
                    - textbox "Default attribution" [ref=e255]: Full path
                  - generic [ref=e256]:
                    - generic [ref=e257]: Environment
                    - textbox "Environment" [ref=e258]: Production
                - button "Save workspace" [ref=e259] [cursor=pointer]
    - button "Open dashboard section navigator" [ref=e261] [cursor=pointer]:
      - generic [ref=e263]: Dashboard navigator
  - button "Manage privacy choices" [ref=e266] [cursor=pointer]: Privacy
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
> 34  |   await page.getByRole('button',{name:'Open monitoring center'}).click()
      |                                                                  ^ Error: locator.click: Test timeout of 30000ms exceeded.
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
  63  |   await page.getByRole('button',{name:'Open monitoring center'}).click()
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
```
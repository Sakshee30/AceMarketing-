# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: frontend-protection.spec.ts >> audience builder traps focus, closes with Escape, and protects an open draft
- Location: tests\e2e\frontend-protection.spec.ts:48:1

# Error details

```
Error: expect(locator).toBeFocused() failed

Locator: getByRole('dialog', { name: 'Audience Builder' }).getByRole('button', { name: /Save|Create/i }).last()
Expected: focused
Timeout: 8000ms
Error: element(s) not found

Call log:
  - Expect "toBeFocused" getByRole('dialog', { name: 'Audience Builder' }).getByRole('button', { name: /Save|Create/i }).last() with timeout 8000ms
  - waiting for getByRole('dialog', { name: 'Audience Builder' }).getByRole('button', { name: /Save|Create/i }).last()

```

```yaml
- link "Skip to main content":
  - /url: "#ace-main-content"
- status: AceMarketing workspace
- link "Skip to workspace content":
  - /url: "#ace-workspace-main"
- status: Audiences · AceMarketing Production
- complementary "Workspace navigation":
  - text: AceMarketing
  - button "AM AceMarketing Production Workspace environment"
  - navigation "Workspace navigation":
    - img
    - textbox "Find feature..."
    - button "Workspace 3":
      - img
      - text: Workspace 3
      - img
    - button "Tracking & Data 19":
      - img
      - text: Tracking & Data 19
      - img
    - button "Measurement & Intelligence 9":
      - img
      - text: Measurement & Intelligence 9
      - img
    - button "Lead & Conversion 12":
      - img
      - text: Lead & Conversion 12
      - img
    - button "Activation & Integrations 7" [expanded]:
      - img
      - text: Activation & Integrations 7
      - img
    - button "Integrations":
      - img
      - text: Integrations
    - button "Data Flows":
      - img
      - text: Data Flows
    - button "Real-Time Activation":
      - img
      - text: Real-Time Activation
    - button "Personalization":
      - img
      - text: Personalization
    - button "Exclusions":
      - img
      - text: Exclusions
    - button "Audiences":
      - img
      - text: Audiences
    - button "Delivery":
      - img
      - text: Delivery
    - button "Operations & Developer 5":
      - img
      - text: Operations & Developer 5
      - img
  - button "Back to website":
    - img
    - text: Back to website
  - text: O owner@example.com owner
- main:
  - button "Open workspace navigation":
    - img
  - img
  - textbox "Search journeys, leads, campaigns, settings..."
  - button "Open monitoring center": ● ● Monitoring
  - button "Support":
    - img
  - button "Region and language":
    - img
  - text: O
  - button "Workspace":
    - img
    - text: Ready
  - button "Tracking & Data":
    - img
    - text: Ready
  - button "Measurement & Intelligence":
    - img
    - text: Needs setup
  - button "Lead & Conversion":
    - img
    - text: Needs setup
  - button "Activation & Integrations":
    - img
    - text: Ready
  - button "Operations & Developer":
    - img
    - text: Needs setup
  - text: Activation / Audiences
  - heading "Audience management" [level=1]
  - paragraph: Activate high-intent first-party segments and suppress converted, low-quality or device-identified users.
  - article:
    - text: Audience records
    - img
    - strong: "0"
    - text: 0 provider-active
  - article:
    - text: Activated identities
    - img
    - strong: "0"
    - text: Materialized non-suppression members
  - article:
    - text: Suppressed identities
    - img
    - strong: "0"
    - text: Materialized suppression members
  - article:
    - text: Observed sync latency
    - img
    - strong: —
    - text: From persisted successful sync timestamps
  - heading "Active segments" [level=3]
  - paragraph: Materialized from persisted lead/device profiles; provider sync state is explicit
  - button "Export"
  - button "New audience":
    - img
    - text: New audience
  - img
  - text: No audiences yet Create a first-party audience from persisted lead, journey or device identity.
  - heading "Lifecycle audiences" [level=3]
  - paragraph: Derived from persisted CRM/lead stages · click a row to preview the real segment
  - button "Acquisition New / active prospects 0 identities Retarget":
    - text: Acquisition New / active prospects 0 identities
    - emphasis: Retarget
    - img
  - button "Nurture Lead / contacted / connected 0 identities Retarget":
    - text: Nurture Lead / contacted / connected 0 identities
    - emphasis: Retarget
    - img
  - button "Decision Qualified / consultation / opportunity 0 identities Lookalike seed":
    - text: Decision Qualified / consultation / opportunity 0 identities
    - emphasis: Lookalike seed
    - img
  - button "Post-purchase Converted / enrolled / closed won 0 identities Suppress":
    - text: Post-purchase Converted / enrolled / closed won 0 identities
    - emphasis: Suppress
    - img
  - heading "Waste-control identity pool" [level=3]
  - paragraph: Turn observed waste pools into persisted suppression/retargeting audiences
  - button "Converted customers Customer ID + hashed PII 0 Suppress":
    - img
    - text: Converted customers Customer ID + hashed PII
    - strong: "0"
    - text: Suppress
  - button "Device-ID identities First-party mobile advertising IDs 0 Retarget":
    - img
    - text: Device-ID identities First-party mobile advertising IDs
    - strong: "0"
    - text: Retarget
  - button "Low-quality leads Lead grade C / D 0 Suppress":
    - img
    - text: Low-quality leads Lead grade C / D
    - strong: "0"
    - text: Suppress
  - heading "Audience signals" [level=3]
  - paragraph: First-party attributes available to the builder
  - text: Lead grade CRM stage Conversion propensity Pricing-page views LTV tier Last activity Device ID present Device platform App ID
  - heading "Activation guardrails" [level=3]
  - paragraph: Provider sync checks consent again before data leaves AceMarketing
  - text: Marketing consent
  - img
  - text: Required for every member Device audience
  - img
  - text: Mobile advertising ID + app context Converted customer
  - img
  - text: Suppress acquisition Low quality / invalid
  - img
  - text: Suppress optimization High-value prospect
  - img
  - text: Seed / optimize
  - dialog "Audience Builder":
    - img
    - text: Audience Builder Create a first-party segment from journey, CRM or device evidence
    - button:
      - img
    - text: Audience name
    - textbox "Audience name": High-intent prospects
    - text: Condition
    - combobox "Condition":
      - option "Lead grade" [selected]
      - option "Conversion propensity"
      - option "CRM stage"
      - option "Pricing-page views"
      - option "LTV tier"
      - option "Last activity"
      - option "Device ID present"
      - option "Device platform"
      - option "App ID"
    - text: Operator
    - combobox "Operator":
      - option "is" [selected]
      - option "is one of"
      - option "is greater than"
      - option "is less than"
      - option "contains"
    - text: Value
    - textbox "Value": A
    - text: Identity key
    - combobox "Identity key":
      - option "Auto · contact first, device fallback" [selected]
      - option "Contact info · hashed email / phone"
      - option "Mobile advertising ID"
    - text: Destination
    - combobox "Destination":
      - option "Google Ads · Meta Ads" [selected]
      - option "Google Ads"
      - option "Meta Ads"
    - text: Mode
    - combobox "Mode":
      - option "Activate" [selected]
      - option "Suppress"
      - option "Retarget"
      - option "Lookalike seed"
    - button "Cancel"
    - button "Preview audience"
- button "Open dashboard section navigator":
  - text: Dashboard navigator
  - img
- button "Manage privacy choices":
  - img
  - text: Privacy
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
  58  |   await page.keyboard.press('Shift+Tab')
> 59  |   await expect(dialog.getByRole('button',{name:'Close audience builder'})).toBeFocused()
      |                                                                         ^ Error: expect(locator).toBeFocused() failed
  60  |   await page.keyboard.press('Shift+Tab')
  61  |   await expect(dialog.getByRole('button',{name:/Save|Create/i}).last()).toBeFocused()
  62  | 
  63  |   page.once('dialog',async confirm=>{
  64  |     expect(confirm.type()).toBe('confirm')
  65  |     expect(confirm.message()).toContain('unsaved work')
  66  |     await confirm.dismiss()
  67  |   })
  68  |   // App navigation events can arrive while a modal prevents pointer access.
  69  |   await page.evaluate(()=>window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:'Monitoring'})))
  70  |   await expect(dialog).toBeVisible()
  71  | 
  72  |   await page.keyboard.press('Escape')
  73  |   await expect(dialog).toHaveCount(0)
  74  |   await expect(page.getByRole('button',{name:/New audience/i})).toBeFocused()
  75  | })
  76  | 
  77  | 
  78  | test('reports browser offline state without polling or hiding current UI',async({page,context})=>{
  79  |   await page.goto('/#/workspace?tab=Overview')
  80  |   await dismissConsent(page)
  81  |   await expect(page.getByRole('heading',{name:/Acquisition command center/i})).toBeVisible()
  82  |   await context.setOffline(true)
  83  |   await page.evaluate(()=>window.dispatchEvent(new Event('offline')))
  84  |   const status=page.getByTestId('connection-status')
  85  |   await expect(status).toBeVisible()
  86  |   await expect(status).toContainText(/appear to be offline/i)
  87  |   await expect(page.getByRole('heading',{name:/Acquisition command center/i})).toBeVisible()
  88  |   await context.setOffline(false)
  89  | })
  90  | 
  91  | 
  92  | test('shows controlled recovery for missing lazy chunks without automatic reload',async({page})=>{
  93  |   await page.goto('/#/workspace?tab=Overview')
  94  |   await dismissConsent(page)
  95  |   await page.evaluate(()=>window.dispatchEvent(new Event('vite:preloadError',{cancelable:true})))
  96  |   const notice=page.getByTestId('chunk-recovery')
  97  |   await expect(notice).toBeVisible()
  98  |   await expect(notice).toContainText(/controlled refresh/i)
  99  |   await expect(notice).toContainText(/will not reload automatically/i)
  100 |   await page.getByRole('button',{name:'Keep working'}).click()
  101 |   await expect(notice).toHaveCount(0)
  102 |   await expect(page.getByRole('heading',{name:/Acquisition command center/i})).toBeVisible()
  103 | })
  104 | 
  105 | 
  106 | test('loads extracted approvals feature from its direct workspace route',async({page})=>{
  107 |   await page.goto('/#/workspace?tab=Approvals')
  108 |   await dismissConsent(page)
  109 |   await expect(page).toHaveURL(/#\/workspace\?tab=Approvals/)
  110 |   await expect(page.getByRole('heading',{name:'Human approval center'})).toBeVisible()
  111 |   await expect(page.getByText(/Persisted agent and automation requests/i)).toBeVisible()
  112 | })
  113 | 
  114 | 
  115 | test('loads extracted monitoring feature from its direct workspace route',async({page})=>{
  116 |   await page.goto('/#/workspace?tab=Monitoring')
  117 |   await dismissConsent(page)
  118 |   await expect(page).toHaveURL(/#\/workspace\?tab=Monitoring/)
  119 |   await expect(page.getByRole('heading',{name:'Platform monitoring'})).toBeVisible()
  120 |   await expect(page.getByText(/24-hour API health/i)).toBeVisible()
  121 | })
  122 | 
  123 | 
  124 | test('loads extracted alerts feature from its direct workspace route',async({page})=>{
  125 |   await page.goto('/#/workspace?tab=Alerts')
  126 |   await dismissConsent(page)
  127 |   await expect(page).toHaveURL(/#\/workspace\?tab=Alerts/)
  128 |   await expect(page.getByRole('heading',{name:'Alert Center'})).toBeVisible()
  129 |   await expect(page.getByText(/Operational incidents/i)).toBeVisible()
  130 | })
  131 | 
  132 | 
  133 | test('loads extracted reports feature from its direct workspace route',async({page})=>{
  134 |   await page.goto('/#/workspace?tab=Reports')
  135 |   await dismissConsent(page)
  136 |   await expect(page).toHaveURL(/#\/workspace\?tab=Reports/)
  137 |   await expect(page.getByRole('heading',{name:'Cohort & automated reports'})).toBeVisible()
  138 |   await expect(page.getByText(/Automated email reports/i)).toBeVisible()
  139 | })
  140 | 
  141 | 
  142 | test('loads extracted executive briefs feature from its direct workspace route',async({page})=>{
  143 |   await page.goto('/#/workspace?tab=Executive%20Briefs')
  144 |   await dismissConsent(page)
  145 |   await expect(page).toHaveURL(/#\/workspace\?tab=Executive%20Briefs/)
  146 |   await expect(page.getByRole('heading',{name:'Executive data snippets'})).toBeVisible()
  147 |   await expect(page.getByText(/Schedule executive brief/i)).toBeVisible()
  148 | })
  149 | 
  150 | 
  151 | test('loads extracted integrations feature from its direct workspace route',async({page})=>{
  152 |   await page.goto('/#/workspace?tab=Integrations')
  153 |   await dismissConsent(page)
  154 |   await expect(page).toHaveURL(/#\/workspace\?tab=Integrations/)
  155 |   await expect(page.getByRole('heading',{name:'Platform-agnostic connectivity'})).toBeVisible()
  156 |   await expect(page.getByText(/Integration catalog/i)).toBeVisible()
  157 | })
  158 | 
  159 | 
```
# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: standalone-frontends.spec.ts >> public demo submission distinguishes unknown outcome from confirmed failure
- Location: tests\e2e\standalone-frontends.spec.ts:151:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.selectOption: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByLabel('Burning pain point')
    - locator resolved to <select required="" name="painPoint">…</select>
  - attempting select option action
    2 × waiting for element to be visible and enabled
      - did not find some options
    - retrying select option action
    - waiting 20ms
    2 × waiting for element to be visible and enabled
      - did not find some options
    - retrying select option action
      - waiting 100ms
    57 × waiting for element to be visible and enabled
       - did not find some options
     - retrying select option action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - link "Skip to main content" [ref=e3] [cursor=pointer]:
      - /url: "#public-main-content"
    - generic [ref=e5]:
      - generic [ref=e6]:
        - generic [ref=e7]: Cleaner first-party signals help growth teams optimize for business outcomes, not shallow clicks.
        - button "See the operating model" [ref=e8] [cursor=pointer]
      - banner [ref=e11]:
        - generic [ref=e12]:
          - button "AceMarketing home" [ref=e13] [cursor=pointer]:
            - generic [ref=e14]: AceMarketing
          - navigation [ref=e20]:
            - button "Industries" [ref=e21] [cursor=pointer]
            - button "Agents" [ref=e24] [cursor=pointer]
            - button "Case Studies" [ref=e27] [cursor=pointer]
            - button "Integrations" [ref=e28] [cursor=pointer]
            - button "Pricing" [ref=e29] [cursor=pointer]
            - button "Resources" [ref=e30] [cursor=pointer]
          - generic [ref=e33]:
            - button "•••• Voice Agent NEW" [ref=e34] [cursor=pointer]:
              - generic [ref=e35]: ••••
              - generic [ref=e36]: Voice Agent
              - generic [ref=e37]: NEW
            - button "Book a demo" [ref=e38] [cursor=pointer]
      - generic [ref=e39]:
        - generic [ref=e40]:
          - generic [ref=e41]:
            - text: BOOK A DEMO
            - heading "Stop wasting ad spend on junk leads." [level=1] [ref=e42]
            - paragraph [ref=e43]: See how a stitched customer journey, cleaner conversion signals and funnel agents can improve lead quality, conversion and attribution.
            - generic [ref=e44]:
              - article [ref=e45]:
                - text: "01"
                - heading "Cleaner data" [level=3] [ref=e46]
                - paragraph [ref=e47]: Connect ad platforms, CRM, calls and messaging into one journey.
              - article [ref=e48]:
                - text: "02"
                - heading "Quality over volume" [level=3] [ref=e49]
                - paragraph [ref=e50]: Optimize campaigns for qualified and closed outcomes, not raw form fills.
              - article [ref=e51]:
                - text: "03"
                - heading "Fast setup path" [level=3] [ref=e52]
                - paragraph [ref=e53]: Use connector and agent patterns instead of rebuilding your whole martech stack.
          - generic [ref=e55]:
            - heading "Tell us about your funnel" [level=2] [ref=e56]
            - generic [ref=e57]:
              - text: Work email
              - textbox "Work email" [ref=e58]:
                - /placeholder: name@company.com
                - text: qa@example.com
            - generic [ref=e59]:
              - text: Company
              - textbox "Company" [active] [ref=e60]:
                - /placeholder: Company name
                - text: QA Company
            - generic [ref=e61]:
              - text: Monthly digital marketing budget
              - combobox "Monthly digital marketing budget" [ref=e62]:
                - option "Select budget" [disabled]
                - option "Under ₹5L"
                - option "₹5L – ₹25L" [selected]
                - option "₹25L – ₹1Cr"
                - option "₹1Cr – ₹5Cr"
                - option "₹5Cr+"
            - generic [ref=e63]:
              - text: Burning pain point
              - combobox "Burning pain point" [ref=e64]:
                - option "Select pain point" [disabled] [selected]
                - option "Junk / low-quality leads"
                - option "Conversion leakage"
                - option "Offline attribution"
                - option "CRM context"
                - option "Cross-platform reporting"
            - button "Continue to scheduling" [ref=e65] [cursor=pointer]
        - generic [ref=e68]:
          - article [ref=e69]:
            - heading "Simple & intuitive" [level=3] [ref=e72]
            - paragraph [ref=e73]: Designed to shorten the time from disconnected data to actionable funnel insight.
          - article [ref=e74]:
            - heading "Connect existing tools" [level=3] [ref=e81]
            - paragraph [ref=e82]: Keep the CRM, calling, messaging and advertising systems your teams already use.
          - article [ref=e83]:
            - heading "Usage-aware deployment" [level=3] [ref=e86]
            - paragraph [ref=e87]: Architecture supports usage metering and scalable packaging without inventing fixed public prices.
        - generic [ref=e92]:
          - text: Connector availability boundary
          - paragraph [ref=e93]: Integration cards clearly distinguish native OAuth connectors from configurable adapters. Shopify remains available through the connector/adaptor framework without implying unsupported native capabilities.
      - contentinfo [ref=e94]:
        - generic [ref=e95]:
          - generic [ref=e96]:
            - button "AceMarketing home" [ref=e97] [cursor=pointer]:
              - generic [ref=e98]: AceMarketing
            - paragraph [ref=e104]: Connected first-party data, journey intelligence, and conversion operations for performance teams.
            - button "Book a demo" [ref=e105] [cursor=pointer]
          - generic [ref=e106]:
            - heading "Platform" [level=4] [ref=e107]
            - button "Data activation" [ref=e108] [cursor=pointer]
            - button "Data enrichment" [ref=e109] [cursor=pointer]
          - generic [ref=e110]:
            - heading "Solutions" [level=4] [ref=e111]
            - button "Lead generation" [ref=e112] [cursor=pointer]
            - button "Enterprise" [ref=e113] [cursor=pointer]
            - button "Mid-market teams" [ref=e114] [cursor=pointer]
            - button "Attribution" [ref=e115] [cursor=pointer]
            - button "Alerts & monitoring" [ref=e116] [cursor=pointer]
            - button "Server-to-server integration" [ref=e117] [cursor=pointer]
          - generic [ref=e118]:
            - heading "Resources" [level=4] [ref=e119]
            - button "About AceMarketing" [ref=e120] [cursor=pointer]
            - button "Use cases" [ref=e121] [cursor=pointer]
            - button "Blogs" [ref=e122] [cursor=pointer]
            - button "Ebooks" [ref=e123] [cursor=pointer]
            - button "Hash utility" [ref=e124] [cursor=pointer]
            - button "Documentation" [ref=e125] [cursor=pointer]
            - button "Contact" [ref=e126] [cursor=pointer]
        - generic [ref=e127]:
          - generic [ref=e128]:
            - generic [ref=e129]: India
            - generic [ref=e130]: Built for multi-channel growth teams operating across online and offline customer journeys.
          - generic [ref=e131]:
            - generic [ref=e132]: Platform support
            - generic [ref=e133]: Use the demo route to discuss onboarding, integrations, and deployment requirements.
        - generic [ref=e134]:
          - generic [ref=e135]: © 2026 AceMarketing. All rights reserved.
          - generic [ref=e136]:
            - button "Privacy Policy" [ref=e137] [cursor=pointer]
            - generic [ref=e138]: •
            - button "Terms & Conditions" [ref=e139] [cursor=pointer]
            - generic [ref=e140]: •
            - button "Security" [ref=e141] [cursor=pointer]
  - button "Manage privacy choices" [ref=e142] [cursor=pointer]: Privacy
```

# Test source

```ts
  60  |   await expect(page.getByRole('heading',{name:'Overview'})).toBeVisible()
  61  |   await expect(page.getByRole('navigation',{name:'Platform control navigation'})).toBeVisible()
  62  |   await expect(page.getByText('Separate trust boundary',{exact:true})).toBeVisible()
  63  |   await expect(page.getByText('Read-only frontend phase',{exact:true})).toBeVisible()
  64  |   await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','noindex,nofollow,noarchive')
  65  |   await expect(page.getByText(/Control plane unavailable|Access denied/i)).toBeVisible()
  66  | })
  67  | 
  68  | test('platform control exposes required operational page ownership without write controls',async({page},testInfo)=>{
  69  |   test.skip(!testInfo.project.name.startsWith('control-'),'platform control project only')
  70  |   await page.goto('/#/changes')
  71  |   await expect(page.getByRole('heading',{name:'Changes'})).toBeVisible()
  72  |   await expect(page.getByText(/Operational change requests, validation, approvals, execution and verification/i)).toBeVisible()
  73  |   await expect(page.getByText(/Write controls remain intentionally absent/i)).toBeVisible()
  74  |   await expect(page.getByRole('button',{name:/Apply|Execute|Delete|Rollback/i})).toHaveCount(0)
  75  | })
  76  | 
  77  | 
  78  | const metrics=async(page:any)=>page.evaluate(()=>((window as any).__ACE_FRONTEND_METRICS__||[]))
  79  | 
  80  | test('public-site lab metrics stay within declared good thresholds where measurable',async({page},testInfo)=>{
  81  |   test.skip(!testInfo.project.name.startsWith('public-'),'public deployment only')
  82  |   await page.goto('/')
  83  |   await page.waitForLoadState('networkidle')
  84  |   await page.getByRole('heading').first().click().catch(()=>{})
  85  |   await page.waitForTimeout(300)
  86  |   const values:any[]=await metrics(page)
  87  |   const latest=(name:string)=>[...values].reverse().find(item=>item.name===name)
  88  |   const lcp=latest('LCP')
  89  |   const cls=latest('CLS')
  90  |   if(lcp)expect(lcp.value).toBeLessThanOrEqual(4000)
  91  |   if(cls)expect(cls.value).toBeLessThanOrEqual(0.25)
  92  |   expect(values.length).toBeGreaterThan(0)
  93  | })
  94  | 
  95  | test('customer app records bounded frontend performance telemetry',async({page},testInfo)=>{
  96  |   test.skip(!testInfo.project.name.startsWith('customer-'),'customer deployment only')
  97  |   await page.goto('/#/workspace?tab=Overview')
  98  |   await page.waitForLoadState('networkidle')
  99  |   await page.waitForTimeout(300)
  100 |   const values:any[]=await metrics(page)
  101 |   expect(values.length).toBeGreaterThan(0)
  102 |   expect(values.length).toBeLessThanOrEqual(200)
  103 |   expect(values.every(item=>['customer-app'].includes(item.surface))).toBeTruthy()
  104 | })
  105 | 
  106 | test('platform control records performance telemetry without exposing secrets',async({page},testInfo)=>{
  107 |   test.skip(!testInfo.project.name.startsWith('control-'),'platform control deployment only')
  108 |   await page.goto('/#/overview')
  109 |   await page.waitForTimeout(300)
  110 |   const values:any[]=await metrics(page)
  111 |   expect(values.length).toBeGreaterThan(0)
  112 |   expect(JSON.stringify(values)).not.toMatch(/token|password|secret/i)
  113 | })
  114 | 
  115 | 
  116 | test('standalone surfaces expose a keyboard skip path to their owned content',async({page},testInfo)=>{
  117 |   const project=testInfo.project.name
  118 |   if(project.startsWith('public-'))await page.goto('/')
  119 |   else if(project.startsWith('customer-'))await page.goto('/#/workspace?tab=Overview')
  120 |   else if(project.startsWith('control-'))await page.goto('/#/overview')
  121 |   else test.skip(true,'standalone surface only')
  122 | 
  123 |   const consent=page.getByRole('dialog',{name:'Privacy choices'})
  124 |   if(await consent.isVisible().catch(()=>false))await consent.getByRole('button',{name:'Essential only'}).click()
  125 | 
  126 |   await page.keyboard.press('Tab')
  127 |   const skip=page.getByRole('link',{name:'Skip to main content'})
  128 |   await expect(skip).toBeVisible()
  129 |   await expect(skip).toBeFocused()
  130 | })
  131 | 
  132 | 
  133 | test('public connector request dialog is focus-managed and input-bounded',async({page},testInfo)=>{
  134 |   test.skip(!testInfo.project.name.startsWith('public-'),'public deployment project only')
  135 |   await page.goto('/integrations')
  136 |   const consent=page.getByRole('dialog',{name:'Privacy choices'})
  137 |   if(await consent.isVisible().catch(()=>false))await consent.getByRole('button',{name:'Essential only'}).click()
  138 |   await page.getByRole('button',{name:'Request a connector'}).last().click()
  139 |   const dialog=page.getByRole('dialog',{name:'Request a connector'})
  140 |   await expect(dialog).toBeVisible()
  141 |   await expect(dialog.getByLabel('Connector name')).toBeFocused()
  142 |   await expect(dialog.getByLabel('Connector name')).toHaveAttribute('maxlength','120')
  143 |   await expect(dialog.getByLabel('Business email')).toHaveAttribute('maxlength','254')
  144 |   await expect(dialog.getByLabel('Company')).toHaveAttribute('maxlength','160')
  145 |   await expect(dialog.getByLabel('How should the data move?')).toHaveAttribute('maxlength','2000')
  146 |   await page.keyboard.press('Escape')
  147 |   await expect(dialog).toHaveCount(0)
  148 | })
  149 | 
  150 | 
  151 | test('public demo submission distinguishes unknown outcome from confirmed failure',async({page},testInfo)=>{
  152 |   test.skip(!testInfo.project.name.startsWith('public-'),'public deployment project only')
  153 |   await page.route('**/api/demo-requests',route=>route.abort('failed'))
  154 |   await page.goto('/demo')
  155 |   const consent=page.getByRole('dialog',{name:'Privacy choices'})
  156 |   if(await consent.isVisible().catch(()=>false))await consent.getByRole('button',{name:'Essential only'}).click()
  157 |   await page.getByLabel('Work email').fill('qa@example.com')
  158 |   await page.getByLabel('Company').fill('QA Company')
  159 |   await page.getByLabel('Monthly digital marketing budget').selectOption({label:'₹5L – ₹25L'})
> 160 |   await page.getByLabel('Burning pain point').selectOption({label:'Attribution'})
      |                                               ^ Error: locator.selectOption: Test timeout of 30000ms exceeded.
  161 |   await page.getByRole('button',{name:/Continue to scheduling/}).click()
  162 |   await expect(page.getByText(/submission outcome is unknown/i)).toBeVisible()
  163 |   await expect(page.getByRole('heading',{name:'Select a date & time'})).toHaveCount(0)
  164 | })
  165 | 
  166 | test('public quote submission keeps network ambiguity distinct from saved state',async({page},testInfo)=>{
  167 |   test.skip(!testInfo.project.name.startsWith('public-'),'public deployment project only')
  168 |   await page.route('**/api/pricing/quote',route=>route.abort('failed'))
  169 |   await page.goto('/pricing')
  170 |   const consent=page.getByRole('dialog',{name:'Privacy choices'})
  171 |   if(await consent.isVisible().catch(()=>false))await consent.getByRole('button',{name:'Essential only'}).click()
  172 |   await page.getByRole('button',{name:'Request quote'}).click()
  173 |   await expect(page.getByText(/quote-request outcome is unknown/i)).toBeVisible()
  174 |   await expect(page.getByText(/configuration was captured by the backend/i)).toHaveCount(0)
  175 | })
  176 | 
```
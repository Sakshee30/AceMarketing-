# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: standalone-frontends.spec.ts >> public quote submission keeps network ambiguity distinct from saved state
- Location: tests\e2e\standalone-frontends.spec.ts:166:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/quote-request outcome is unknown/i)
Expected: visible
Timeout: 8000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText(/quote-request outcome is unknown/i) with timeout 8000ms
  - waiting for getByText(/quote-request outcome is unknown/i)

```

```yaml
- link "Skip to main content":
  - /url: "#public-main-content"
- text: Cleaner first-party signals help growth teams optimize for business outcomes, not shallow clicks.
- button "See the operating model":
  - text: See the operating model
  - img
- banner:
  - button "AceMarketing home": AceMarketing
  - navigation:
    - button "Industries":
      - text: Industries
      - img
    - button "Agents":
      - text: Agents
      - img
    - button "Case Studies"
    - button "Integrations"
    - button "Pricing"
    - button "Resources":
      - text: Resources
      - img
  - button "•••• Voice Agent NEW"
  - button "Book a demo"
- text: PRICING
- heading "Build a stack around the way your funnel actually works." [level=1]
- paragraph: Choose your data sources, growth challenges and channels. AceMarketing uses the backend recommendation service to assemble a practical starting configuration, then captures the setup for a sales quote.
- text: "1"
- heading "Tell us about your setup" [level=2]
- paragraph: Configure the environment used for agent recommendations.
- text: Monthly lead volume
- strong: 5,000
- slider "Monthly lead volume 5,000 200 100,000+": "5000"
- text: 200 100,000+
- heading "Where does your data live?" [level=3]
- button "CRM"
- button "Website / App"
- button "WhatsApp"
- button "Calling"
- button "Data warehouse"
- button "Custom backend"
- heading "Select your current data challenges" [level=3]
- button "Lead quality"
- button "Conversion leakage"
- button "Attribution"
- heading "Which channels do you run?" [level=3]
- button "Google Ads"
- button "Meta Ads"
- button "LinkedIn Ads"
- button "Microsoft Ads"
- button "Offline"
- text: "2"
- heading "Choose your agents" [level=2]
- paragraph: Recommended agents are refreshed by the backend from your selected challenges.
- article:
  - text: Lead Quality RECOMMENDED
  - heading "Meta Advanced CAPI" [level=3]
  - strong: +25–40% ROAS
  - paragraph: Return qualified outcomes to Meta server-side with deduplication.
  - button "Remove"
- article:
  - text: Lead Quality RECOMMENDED
  - heading "Google ECL / OCI" [level=3]
  - strong: −30–50% CPQL
  - paragraph: Send enhanced and offline conversions back to Google Ads.
  - button "Remove"
- article:
  - text: Lead Quality
  - heading "ChatGPT Ads CAPI" [level=3]
  - strong: First-party measurement
  - paragraph: Send consent-aware server-side conversion events to ChatGPT Ads with oppref matching.
  - button "Add agent"
- article:
  - text: Lead Quality RECOMMENDED
  - heading "Call Tracking Events" [level=3]
  - strong: +80% call attribution
  - paragraph: Attribute inbound calls to campaign, keyword and creative context.
  - button "Remove"
- article:
  - text: Lead Quality RECOMMENDED
  - heading "Custom Integration" [level=3]
  - strong: 100% channel mix
  - paragraph: Connect custom CRMs, ad platforms and internal data sources.
  - button "Remove"
- article:
  - text: Conversion
  - heading "Lead Grading" [level=3]
  - strong: +40–60% conversion
  - paragraph: Score and prioritize leads from journey and CRM evidence.
  - button "Add agent"
- article:
  - text: Conversion
  - heading "CRM Enrichment" [level=3]
  - strong: −70% research time
  - paragraph: Attach acquisition, behavior and interaction context to each record.
  - button "Add agent"
- article:
  - text: Conversion
  - heading "Voice Lead Qualification" [level=3]
  - strong: +90% speed-to-lead
  - paragraph: Call inbound leads quickly and qualify intent conversationally.
  - button "Add agent"
- article:
  - text: Conversion
  - heading "Voice Scheduler" [level=3]
  - strong: +45% bookings
  - paragraph: Book meetings for qualified leads and synchronize calendars.
  - button "Add agent"
- article:
  - text: Conversion
  - heading "Meeting Reminder" [level=3]
  - strong: 10–25% leads recovered
  - paragraph: Re-engage scheduled leads before appointments to reduce drop-off.
  - button "Add agent"
- article:
  - text: Conversion
  - heading "Feedback Agent" [level=3]
  - strong: 5× more feedback
  - paragraph: Collect post-interaction feedback and surface objections.
  - button "Add agent"
- article:
  - text: Visibility
  - heading "Ask Ace" [level=3]
  - strong: +20–40% qualified leads
  - paragraph: Ask journey, funnel and attribution questions in plain language.
  - button "Add agent"
- complementary:
  - text: Your stack
  - strong: 4 agents
  - text: Monthly lead volume
  - strong: 5,000
  - text: Channels
  - strong: "2"
  - text: Estimated total
  - strong: Custom quote
  - text: Pricing depends on selected agents, data volume, destinations and deployment requirements.
  - button "Open workspace":
    - text: Open workspace
    - img
  - button "Request quote"
  - alert: Could not save the configuration. Try again or open the demo form.
  - button "Talk to sales"
- contentinfo:
  - button "AceMarketing home": AceMarketing
  - paragraph: Connected first-party data, journey intelligence, and conversion operations for performance teams.
  - button "Book a demo"
  - heading "Platform" [level=4]
  - button "Data activation"
  - button "Data enrichment"
  - heading "Solutions" [level=4]
  - button "Lead generation"
  - button "Enterprise"
  - button "Mid-market teams"
  - button "Attribution"
  - button "Alerts & monitoring"
  - button "Server-to-server integration"
  - heading "Resources" [level=4]
  - button "About AceMarketing"
  - button "Use cases"
  - button "Blogs"
  - button "Ebooks"
  - button "Hash utility"
  - button "Documentation"
  - button "Contact"
  - text: India Built for multi-channel growth teams operating across online and offline customer journeys. Platform support Use the demo route to discuss onboarding, integrations, and deployment requirements. © 2026 AceMarketing. All rights reserved.
  - button "Privacy Policy"
  - text: •
  - button "Terms & Conditions"
  - text: •
  - button "Security"
- button "Manage privacy choices":
  - img
  - text: Privacy
```

# Test source

```ts
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
  160 |   await page.getByLabel('Burning pain point').selectOption({label:'Attribution'})
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
> 173 |   await expect(page.getByText(/quote-request outcome is unknown/i)).toBeVisible()
      |                                                                     ^ Error: expect(locator).toBeVisible() failed
  174 |   await expect(page.getByText(/configuration was captured by the backend/i)).toHaveCount(0)
  175 | })
  176 | 
```
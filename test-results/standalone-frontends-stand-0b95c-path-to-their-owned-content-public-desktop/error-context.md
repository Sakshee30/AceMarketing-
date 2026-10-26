# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: standalone-frontends.spec.ts >> standalone surfaces expose a keyboard skip path to their owned content
- Location: tests\e2e\standalone-frontends.spec.ts:116:1

# Error details

```
Error: expect(locator).toBeFocused() failed

Locator:  getByRole('link', { name: 'Skip to main content' })
Expected: focused
Received: inactive
Timeout:  8000ms

Call log:
  - Expect "toBeFocused" getByRole('link', { name: 'Skip to main content' }) with timeout 8000ms
  - waiting for getByRole('link', { name: 'Skip to main content' })
    19 × locator resolved to <a class="ace-skip-link" href="#public-main-content">Skip to main content</a>
       - unexpected value "inactive"

```

```yaml
- link "Skip to main content":
  - /url: "#public-main-content"
```

# Test source

```ts
  29  | 
  30  | test('standalone public navigation remains usable on approved desktop and mobile profiles',async({page},testInfo)=>{
  31  |   test.skip(!testInfo.project.name.startsWith('public-'),'public deployment project only')
  32  |   await page.goto('/')
  33  |   await dismissConsent(page)
  34  |   await expect(page.getByRole('heading').first()).toBeVisible()
  35  |   await page.goto('/integrations')
  36  |   await expect(page.getByText('INTEGRATIONS',{exact:true}).first()).toBeVisible()
  37  | })
  38  | 
  39  | test('standalone customer deployment remains private and direct-linkable',async({page},testInfo)=>{
  40  |   test.skip(!testInfo.project.name.startsWith('customer-'),'customer deployment project only')
  41  |   await page.goto('/#/workspace?tab=Overview')
  42  |   await dismissConsent(page)
  43  |   await expect(page.getByRole('heading',{name:/Acquisition command center/i})).toBeVisible()
  44  |   await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','noindex,nofollow,noarchive')
  45  |   await expect(page.getByRole('navigation',{name:'Workspace navigation'})).toBeVisible()
  46  | })
  47  | 
  48  | test('standalone customer login stays available without loading public-site composition',async({page},testInfo)=>{
  49  |   test.skip(!testInfo.project.name.startsWith('customer-'),'customer deployment project only')
  50  |   await page.goto('/#/login')
  51  |   await dismissConsent(page)
  52  |   await expect(page.getByRole('heading',{name:'Log in to your workspace'})).toBeVisible()
  53  |   await expect(page.getByRole('button',{name:'Continue with Google'})).toBeVisible()
  54  | })
  55  | 
  56  | 
  57  | test('standalone platform control deployment is isolated and fails honestly without a control API',async({page},testInfo)=>{
  58  |   test.skip(!testInfo.project.name.startsWith('control-'),'platform control project only')
  59  |   await page.goto('/#/overview')
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
> 129 |   await expect(skip).toBeFocused()
      |                      ^ Error: expect(locator).toBeFocused() failed
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
  173 |   await expect(page.getByText(/quote-request outcome is unknown/i)).toBeVisible()
  174 |   await expect(page.getByText(/configuration was captured by the backend/i)).toHaveCount(0)
  175 | })
  176 | 
```
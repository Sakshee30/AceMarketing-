# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: standalone-frontends.spec.ts >> public-site lab metrics stay within declared good thresholds where measurable
- Location: tests\e2e\standalone-frontends.spec.ts:80:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForLoadState: Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - link "Skip to main content" [ref=e3] [cursor=pointer]:
      - /url: "#public-main-content"
    - generic [ref=e5]:
      - generic [ref=e6]:
        - generic [ref=e7]: Better first-party signals help teams turn paid attention into measurable business outcomes.
        - button "See how AceMarketing closes the loop" [ref=e8] [cursor=pointer]
      - banner [ref=e11]:
        - generic [ref=e12]:
          - button "AceMarketing home" [ref=e13] [cursor=pointer]:
            - generic [ref=e14]: AceMarketing
          - button "Book a demo" [ref=e21] [cursor=pointer]
          - button "Open navigation menu" [ref=e22] [cursor=pointer]
      - generic [ref=e25]:
        - generic [ref=e26]:
          - heading [level=1] [ref=e27]:
            - text: Make paid media learn
            - emphasis [ref=e28]: from real outcomes
            - text: ", notsurface-level clicks."
          - paragraph [ref=e29]: AceMarketing connects acquisition, CRM, calls, messaging, and revenue into one operating layer so teams can improve signal quality, conversion handoffs, and measurement without rebuilding their stack.
          - button "Get a Demo" [ref=e30] [cursor=pointer]
        - generic [ref=e31]:
          - generic [ref=e33]:
            - generic [ref=e34]:
              - text: Connect every touchpoint
              - generic [ref=e35]: Website forms, calls & WhatsApp messages.
            - generic [ref=e36]:
              - generic [ref=e37]:
                - generic [ref=e38]: Unified Journey
                - generic [ref=e39]: LIVE
              - generic [ref=e40]:
                - generic [ref=e41]: "1"
                - generic [ref=e42]:
                  - generic [ref=e43]: Google Ads
                  - generic [ref=e44]: Click captured
              - generic [ref=e45]:
                - generic [ref=e46]: "2"
                - generic [ref=e47]:
                  - generic [ref=e48]: Website
                  - generic [ref=e49]: High-intent pages
              - generic [ref=e50]:
                - generic [ref=e51]: "3"
                - generic [ref=e52]:
                  - generic [ref=e53]: WhatsApp
                  - generic [ref=e54]: Conversation started
              - generic [ref=e55]:
                - generic [ref=e56]: "4"
                - generic [ref=e57]:
                  - generic [ref=e58]: CRM
                  - generic [ref=e59]: Qualified lead
              - generic [ref=e60]:
                - generic [ref=e61]: "5"
                - generic [ref=e62]:
                  - generic [ref=e63]: Revenue
                  - generic [ref=e64]: Closed outcome
          - generic "Hero slides" [ref=e65]:
            - button "Show hero slide 1" [ref=e66] [cursor=pointer]
            - button "Show hero slide 2" [ref=e67] [cursor=pointer]
            - button "Show hero slide 3" [ref=e68] [cursor=pointer]
          - button "Next hero slide" [ref=e69] [cursor=pointer]
      - region "Reference customer categories" [ref=e72]:
        - generic [ref=e73]: TRUSTED ACROSS COMPLEX, MULTI-TOUCH FUNNELS
        - generic [ref=e74]:
          - generic [ref=e75]: EdTech
          - generic [ref=e76]: Healthcare
          - generic [ref=e77]: Retail
          - generic [ref=e78]: D2C
          - generic [ref=e79]: Financial Services
          - generic [ref=e80]: SaaS
          - generic [ref=e81]: Home Services
          - generic [ref=e82]: Professional Services
          - generic [ref=e83]: Marketplaces
          - generic [ref=e84]: Multi-location
        - generic [ref=e85]: Example categories illustrate the complex, multi-touch funnels AceMarketing is designed to support; no third-party customer relationship is implied.
      - generic [ref=e86]:
        - generic [ref=e87]:
          - generic [ref=e88]: THREE SIGNAL BREAKS THAT HOLD GROWTH BACK.
          - heading "Repair the data flow before media efficiency slips." [level=2] [ref=e89]
        - generic [ref=e90]:
          - button "Lead Quality" [ref=e91] [cursor=pointer]
          - button "Conversion" [ref=e92] [cursor=pointer]
          - button "Attribution" [ref=e93] [cursor=pointer]
        - generic [ref=e94]:
          - generic [ref=e95]: "01"
          - generic [ref=e96]:
            - text: LEAD QUALITY
            - heading "Campaigns keep finding form-fillers instead of people who actually progress." [level=3] [ref=e97]
            - paragraph [ref=e98]: "Why it happens: Ad platforms optimize on form-fills when closed revenue never flows back. The algorithm learns to find submitters rather than buyers."
          - generic [ref=e99]:
            - text: WHAT ACEMARKETING DOES
            - paragraph [ref=e100]: Connect first-party outcomes and return qualified leads, enrolments, bookings and store sales server-side, with deduplication across sources.
            - text: WHAT YOU GET
            - heading "Better lead quality" [level=4] [ref=e101]
            - paragraph [ref=e102]: Optimization moves toward the people who actually progress and close.
        - generic [ref=e103]:
          - generic [ref=e104]: See how one operating layer connects all three breakpoints.
          - button "Get a Demo" [ref=e105] [cursor=pointer]
      - generic [ref=e106]:
        - generic [ref=e107]:
          - generic [ref=e108]: ONE OPERATING LAYER, TWO CORE JOBS
          - heading "Unify the journey, then let automation act with context." [level=2] [ref=e109]
          - paragraph [ref=e110]: Measurement and execution work better when every workflow sees the same customer and revenue truth.
        - generic [ref=e111]:
          - article [ref=e112]:
            - generic [ref=e113]: "01"
            - generic [ref=e119]: CAPABILITY 01
            - heading "Unify the customer path" [level=3] [ref=e120]
            - paragraph [ref=e121]: Every lead source — forms, website, app, calls, walk-ins — and every tool connected into one journey per customer, online and offline, from first touch to closed revenue.
            - list [ref=e122]:
              - listitem [ref=e123]: Identity stitching
              - listitem [ref=e124]: Click-ID persistence
              - listitem [ref=e125]: Online + offline events
              - listitem [ref=e126]: Chronological journey view
          - article [ref=e127]:
            - generic [ref=e128]: "02"
            - generic [ref=e132]: CAPABILITY 02
            - heading "Automate the handoffs that slow revenue" [level=3] [ref=e133]
            - paragraph [ref=e134]: Choose specialized agents for qualification, routing, follow-up, closure match-back and signal return. Each agent acts with shared journey context.
            - list [ref=e135]:
              - listitem [ref=e136]: 11 prebuilt agents
              - listitem [ref=e137]: Custom agents
              - listitem [ref=e138]: Human approval controls
              - listitem [ref=e139]: Audit trail
        - generic [ref=e140]:
          - text: stitched journey+agents at every step=
          - strong [ref=e141]: a funnel that learns
      - generic [ref=e142]:
        - generic [ref=e143]:
          - generic [ref=e144]:
            - text: SPECIALIST AUTOMATION FOR EVERY HANDOFF
            - heading "Choose the agents that improve your funnel where it matters most." [level=2] [ref=e145]
            - paragraph [ref=e146]: Each agent works from shared journey context instead of isolated channel data.
          - button "Explore agents" [ref=e147] [cursor=pointer]
        - generic [ref=e150]:
          - button "Lead Quality" [ref=e151] [cursor=pointer]
          - button "Conversion" [ref=e152] [cursor=pointer]
          - button "Visibility" [ref=e153] [cursor=pointer]
        - generic [ref=e154]:
          - generic [ref=e155]: Don’t see your leak?
          - generic [ref=e156]: Build your own agent on the stitched journey — or configure one with the workspace builder.
          - button "Build custom agent" [ref=e157] [cursor=pointer]
      - generic [ref=e158]:
        - generic [ref=e159]:
          - generic [ref=e160]:
            - text: OPERATING PATTERNS
            - heading "See how stronger signals and connected journeys can improve the operating model." [level=2] [ref=e161]
            - paragraph [ref=e162]: These are illustrative workflow patterns for product education, not customer performance claims.
          - button "See implementation patterns" [ref=e163] [cursor=pointer]
        - generic [ref=e166]:
          - button "Open Leverage Edu reference case study" [ref=e167] [cursor=pointer]:
            - generic [ref=e168]: LEAD QUALITY
            - generic [ref=e169]: LE
            - strong [ref=e170]: −38%
            - heading "cost per qualified lead" [level=3] [ref=e171]
            - paragraph [ref=e172]: "Reference pattern: enrolment outcomes returned server-side and deduplicated across form, call and counsellor sources."
            - generic [ref=e173]:
              - generic [ref=e174]: Leverage Edu
              - generic [ref=e175]: Edtech
          - button "Open India IVF reference case study" [ref=e178] [cursor=pointer]:
            - generic [ref=e179]: CONVERSION
            - generic [ref=e180]: IVF
            - strong [ref=e181]: +52%
            - heading "lead-to-consultation conversion" [level=3] [ref=e182]
            - paragraph [ref=e183]: "Reference pattern: every lead graded on arrival, routed with context and qualified quickly."
            - generic [ref=e184]:
              - generic [ref=e185]: India IVF
              - generic [ref=e186]: Healthcare
          - button "Open Blue Tokai reference case study" [ref=e189] [cursor=pointer]:
            - generic [ref=e190]: VISIBILITY & ATTRIBUTION
            - generic [ref=e191]: BT
            - strong [ref=e192]: 31%
            - heading "revenue re-attributed" [level=3] [ref=e193]
            - paragraph [ref=e194]: "Reference pattern: web, app and offline interactions stitched into full-path attribution."
            - generic [ref=e195]:
              - generic [ref=e196]: Blue Tokai
              - generic [ref=e197]: Consumer goods
          - button "Open Jaro Education reference case study" [ref=e200] [cursor=pointer]:
            - generic [ref=e201]: CONVERSION
            - generic [ref=e202]: JE
            - strong [ref=e203]: +41%
            - heading "enrolment rate" [level=3] [ref=e204]
            - paragraph [ref=e205]: "Reference pattern: counsellor calls and follow-ups tracked with full journey context."
            - generic [ref=e206]:
              - generic [ref=e207]: Jaro Education
              - generic [ref=e208]: Edtech
      - generic [ref=e211]:
        - generic [ref=e212]:
          - text: AI IN ACTION
          - heading "Agent workflows mapped to real funnel operations." [level=2] [ref=e213]
          - paragraph [ref=e214]: Instead of decorative screenshots, AceMarketing uses original workflow cards to show how specialized agents cooperate around a stitched journey.
        - generic [ref=e215]:
          - article [ref=e216]:
            - generic [ref=e217]: "01"
            - heading "Lead arrives" [level=3] [ref=e222]
            - text: Lead Grading
            - paragraph [ref=e223]: Scores intent using source, pages, campaign and CRM history.
          - article [ref=e224]:
            - generic [ref=e225]: "02"
            - heading "Context assembled" [level=3] [ref=e230]
            - text: CRM Enrichment
            - paragraph [ref=e231]: Adds campaign, content, chat and call context before sales outreach.
          - article [ref=e232]:
            - generic [ref=e233]: "03"
            - heading "Immediate outreach" [level=3] [ref=e238]
            - text: Voice Lead Qualification
            - paragraph [ref=e239]: Calls quickly, captures intent and routes the sales-ready lead.
          - article [ref=e240]:
            - generic [ref=e241]: "04"
            - heading "Meeting created" [level=3] [ref=e246]
            - text: Voice Scheduler
            - paragraph [ref=e247]: Finds a slot and syncs it to the team calendar.
          - article [ref=e248]:
            - generic [ref=e249]: "05"
            - heading "No-show risk" [level=3] [ref=e254]
            - text: Meeting Reminder
            - paragraph [ref=e255]: Triggers reminders before the appointment goes cold.
          - article [ref=e256]:
            - generic [ref=e257]: "06"
            - heading "Closed outcome" [level=3] [ref=e262]
            - text: Signal Return
            - paragraph [ref=e263]: Matches closure back to source and returns the qualified event to ad platforms.
      - generic [ref=e264]:
        - generic [ref=e265]:
          - text: WHEN OPTIMIZATION LOSES THE BUSINESS CONTEXT
          - heading [level=2] [ref=e266]:
            - text: Media decisions weaken when
            - emphasis [ref=e267]: the signal chain breaks.
          - paragraph [ref=e268]: Rising acquisition cost, lower-quality demand, and conflicting attribution often trace back to missing identity, delayed CRM outcomes, and disconnected offline events.
        - generic [ref=e272]:
          - generic [ref=e278]: Shared data truth
          - generic [ref=e279]: Ads · CRM · Calls · WhatsApp · Revenue
      - generic [ref=e280]:
        - generic [ref=e281]:
          - text: WHERE PERFORMANCE SYSTEMS BREAK
          - heading "The visible problem is often downstream from the real data failure." [level=2] [ref=e282]
          - paragraph [ref=e283]: Explore six recurring failure patterns that appear when acquisition, identity, CRM outcomes, audiences, and consent are not operating from one shared model.
        - generic [ref=e284]:
          - generic [ref=e285]:
            - button "01 Business & operational impact" [ref=e286] [cursor=pointer]:
              - generic [ref=e287]: "01"
              - generic [ref=e288]: Business & operational impact
            - button "02 Tracking & data quality" [ref=e291] [cursor=pointer]:
              - generic [ref=e292]: "02"
              - generic [ref=e293]: Tracking & data quality
            - button "03 Ad platform optimization" [ref=e296] [cursor=pointer]:
              - generic [ref=e297]: "03"
              - generic [ref=e298]: Ad platform optimization
            - button "04 Attribution & measurement" [ref=e301] [cursor=pointer]:
              - generic [ref=e302]: "04"
              - generic [ref=e303]: Attribution & measurement
            - button "05 Audience & personalization" [ref=e306] [cursor=pointer]:
              - generic [ref=e307]: "05"
              - generic [ref=e308]: Audience & personalization
            - button "06 Privacy, consent & compliance" [ref=e311] [cursor=pointer]:
              - generic [ref=e312]: "06"
              - generic [ref=e313]: Privacy, consent & compliance
          - article [ref=e316]:
            - generic [ref=e317]: "01"
            - text: Business & operational impact
            - heading "Teams lose speed when every system tells a different story." [level=3] [ref=e318]
            - list [ref=e319]:
              - listitem [ref=e320]: Acquisition cost rises while lead quality becomes harder to explain
              - listitem [ref=e323]: Marketing, sales, and leadership work from different numbers
              - listitem [ref=e326]: Teams spend time repairing tracking instead of scaling campaigns
              - listitem [ref=e329]: Budget decisions are made without reliable funnel evidence
            - button "Connect the operating truth" [ref=e332] [cursor=pointer]
      - generic [ref=e335]:
        - generic [ref=e336]:
          - text: SECURITY & DATA OWNERSHIP
          - heading "Keep control of the data that powers your growth." [level=2] [ref=e337]
          - paragraph [ref=e338]: AceMarketing is designed around first-party ownership, explicit consent, scoped access, and auditable activation across connected systems.
          - generic [ref=e339]:
            - button "Review security controls" [ref=e340] [cursor=pointer]
            - generic [ref=e341]: Certification badges are shown as roadmap targets until independently verified.
        - generic [ref=e342]:
          - article [ref=e343]:
            - generic [ref=e347]: ISO 27001
            - generic [ref=e348]: Control framework target
          - article [ref=e349]:
            - generic [ref=e353]: SHA-256
            - generic [ref=e354]: Identifier hashing design
          - article [ref=e355]:
            - generic [ref=e359]: GDPR
            - generic [ref=e360]: Consent / deletion target
          - article [ref=e361]:
            - generic [ref=e365]: HIPAA
            - generic [ref=e366]: Healthcare safeguards target
          - article [ref=e367]:
            - generic [ref=e371]: India DPDP
            - generic [ref=e372]: Readiness roadmap
      - generic [ref=e373]:
        - generic [ref=e374]:
          - text: TURN CONNECTED DATA INTO BETTER DECISIONS
          - heading "Give every channel the business outcomes it needs to optimize intelligently." [level=2] [ref=e375]
        - button "Book a demo" [ref=e376] [cursor=pointer]
      - generic [ref=e379]:
        - generic [ref=e380]:
          - text: SEE THE PRODUCT FLOW
          - heading "Operate the entire paid funnel from one workspace." [level=2] [ref=e381]
          - paragraph [ref=e382]: Connect → observe → enrich → qualify → activate → attribute → learn.
          - button "Open interactive workspace" [ref=e383] [cursor=pointer]
        - generic [ref=e386]:
          - heading "Book a product walkthrough" [level=3] [ref=e387]
          - generic [ref=e388]:
            - text: Work email
            - textbox "Work email" [ref=e389]:
              - /placeholder: name@company.com
          - generic [ref=e390]:
            - text: Company
            - textbox "Company" [ref=e391]:
              - /placeholder: Company name
          - generic [ref=e392]:
            - text: Monthly ad spend
            - combobox "Monthly ad spend" [ref=e393]:
              - option "Select range" [disabled] [selected]
              - option "Under ₹5L"
              - option "₹5L – ₹25L"
              - option "₹25L – ₹1Cr"
              - option "₹1Cr+"
          - generic [ref=e394]:
            - text: Primary challenge
            - combobox "Primary challenge" [ref=e395]:
              - option "Select challenge" [disabled] [selected]
              - option "Lead quality"
              - option "Conversion leakage"
              - option "Attribution"
              - option "Tracking/data quality"
          - button "Request demo" [ref=e396] [cursor=pointer]
      - contentinfo [ref=e399]:
        - generic [ref=e400]:
          - generic [ref=e401]:
            - button "AceMarketing home" [ref=e402] [cursor=pointer]:
              - generic [ref=e403]: AceMarketing
            - paragraph [ref=e409]: Connected first-party data, journey intelligence, and conversion operations for performance teams.
            - button "Book a demo" [ref=e410] [cursor=pointer]
          - generic [ref=e411]:
            - heading "Platform" [level=4] [ref=e412]
            - button "Data activation" [ref=e413] [cursor=pointer]
            - button "Data enrichment" [ref=e414] [cursor=pointer]
          - generic [ref=e415]:
            - heading "Solutions" [level=4] [ref=e416]
            - button "Lead generation" [ref=e417] [cursor=pointer]
            - button "Enterprise" [ref=e418] [cursor=pointer]
            - button "Mid-market teams" [ref=e419] [cursor=pointer]
            - button "Attribution" [ref=e420] [cursor=pointer]
            - button "Alerts & monitoring" [ref=e421] [cursor=pointer]
            - button "Server-to-server integration" [ref=e422] [cursor=pointer]
          - generic [ref=e423]:
            - heading "Resources" [level=4] [ref=e424]
            - button "About AceMarketing" [ref=e425] [cursor=pointer]
            - button "Use cases" [ref=e426] [cursor=pointer]
            - button "Blogs" [ref=e427] [cursor=pointer]
            - button "Ebooks" [ref=e428] [cursor=pointer]
            - button "Hash utility" [ref=e429] [cursor=pointer]
            - button "Documentation" [ref=e430] [cursor=pointer]
            - button "Contact" [ref=e431] [cursor=pointer]
        - generic [ref=e432]:
          - generic [ref=e433]:
            - generic [ref=e434]: India
            - generic [ref=e435]: Built for multi-channel growth teams operating across online and offline customer journeys.
          - generic [ref=e436]:
            - generic [ref=e437]: Platform support
            - generic [ref=e438]: Use the demo route to discuss onboarding, integrations, and deployment requirements.
        - generic [ref=e439]:
          - generic [ref=e440]: © 2026 AceMarketing. All rights reserved.
          - generic [ref=e441]:
            - button "Privacy Policy" [ref=e442] [cursor=pointer]
            - generic [ref=e443]: •
            - button "Terms & Conditions" [ref=e444] [cursor=pointer]
            - generic [ref=e445]: •
            - button "Security" [ref=e446] [cursor=pointer]
      - dialog "Cookie preferences" [ref=e447]:
        - generic [ref=e448]:
          - text: Cookie preferences
          - paragraph [ref=e449]: Necessary storage is always on. Optional analytics, advertising and functionality categories can be enabled independently.
          - generic [ref=e450]:
            - generic [ref=e451]:
              - checkbox "analytics" [ref=e452]
              - text: analytics
            - generic [ref=e453]:
              - checkbox "advertising" [ref=e454]
              - text: advertising
            - generic [ref=e455]:
              - checkbox "functionality" [ref=e456]
              - text: functionality
        - generic [ref=e457]:
          - button "Necessary only" [ref=e458] [cursor=pointer]
          - button "Accept all" [ref=e459] [cursor=pointer]
          - button "Save preferences" [ref=e460] [cursor=pointer]
  - dialog "Privacy choices" [ref=e461]:
    - generic [ref=e466]:
      - generic [ref=e467]: Your privacy choices
      - paragraph [ref=e468]: Essential storage is always used for security and core functionality. Analytics, advertising signals and personalization stay off until you choose to enable them.
    - generic [ref=e469]:
      - button "Essential only" [ref=e470] [cursor=pointer]
      - button "Allow analytics" [ref=e471] [cursor=pointer]
      - button "Allow all" [ref=e472] [cursor=pointer]
```

# Test source

```ts
  1   | import {expect,test} from '@playwright/test'
  2   | 
  3   | const dismissConsent=async(page:any)=>{
  4   |   const dialog=page.getByRole('dialog',{name:'Privacy choices'})
  5   |   if(await dialog.isVisible().catch(()=>false)){
  6   |     await dialog.getByRole('button',{name:'Essential only'}).click()
  7   |     await expect(dialog).toHaveCount(0)
  8   |   }
  9   | }
  10  | 
  11  | test('standalone public deployment preserves discoverability, SEO and privacy boundaries',async({page},testInfo)=>{
  12  |   test.skip(!testInfo.project.name.startsWith('public-'),'public deployment project only')
  13  |   await page.goto('/pricing')
  14  |   await dismissConsent(page)
  15  |   await expect(page.getByRole('heading').first()).toBeVisible()
  16  |   await expect(page).toHaveTitle(/Pricing.*AceMarketing/i)
  17  |   await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','index,follow')
  18  |   await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',/\/pricing$/)
  19  | 
  20  |   const requestHeaders:string[]=[]
  21  |   page.on('request',request=>{
  22  |     if(request.url().includes('/api/'))requestHeaders.push(String(request.headers()['authorization']||''))
  23  |   })
  24  |   await page.goto('/industries')
  25  |   await dismissConsent(page)
  26  |   await expect(page.getByText('INDUSTRIES',{exact:true}).first()).toBeVisible()
  27  |   expect(requestHeaders.filter(Boolean)).toEqual([])
  28  | })
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
> 83  |   await page.waitForLoadState('networkidle')
      |              ^ Error: page.waitForLoadState: Test timeout of 30000ms exceeded.
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
  173 |   await expect(page.getByText(/quote-request outcome is unknown/i)).toBeVisible()
  174 |   await expect(page.getByText(/configuration was captured by the backend/i)).toHaveCount(0)
  175 | })
  176 | 
```
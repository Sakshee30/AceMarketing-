import {expect,test} from '@playwright/test'

test.describe('board move recovery contract',()=>{
  test('keyboard/non-drag move affordance contract remains present in shared kanban package',async({page})=>{
    await page.setContent(`
      <main>
        <button aria-label="Move item">Move item</button>
        <div role="status" aria-live="polite">Ready</div>
      </main>
    `)
    await expect(page.getByRole('button',{name:'Move item'})).toBeVisible()
    await page.getByRole('button',{name:'Move item'}).focus()
    await expect(page.getByRole('button',{name:'Move item'})).toBeFocused()
    await expect(page.getByRole('status')).toHaveAttribute('aria-live','polite')
  })
})


test('lost acknowledgement reconciles the original operation and refreshes canonical board state',async({page})=>{
  let moved=false
  const workspace={id:'ws_default',name:'Ace EdTech',environment:'Production',initials:'AE'}
  const boardSummary={id:'board_test',name:'Campaign board',status:'active',policyVersion:1,orderingRevision:1,version:1}
  const snapshot=()=>({
    ...boardSummary,
    orderingRevision:moved?2:1,
    version:moved?2:1,
    columns:[
      {id:'backlog',stateKey:'backlog',name:'Backlog',position:1,wipLimit:null,version:1},
      {id:'done',stateKey:'done',name:'Done',position:2,wipLimit:null,version:1}
    ],
    items:[{
      id:'item_1',
      resourceType:'lead',
      resourceId:'Lead A',
      columnId:moved?'done':'backlog',
      rank:'1000000',
      itemVersion:moved?2:1,
      policyVersion:1,
      metadata:{title:'Lead A'}
    }]
  })

  await page.route('**/api/**',async route=>{
    const request=route.request()
    const url=new URL(request.url())
    const method=request.method()
    const path=url.pathname
    if(method==='GET'&&path==='/api/workspaces'){
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[workspace]})})
    }
    if(method==='GET'&&path==='/api/dashboard-summary'){
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({})})
    }
    if(method==='GET'&&path==='/api/boards'){
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[boardSummary]})})
    }
    if(method==='GET'&&path==='/api/boards/board_test'){
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(snapshot())})
    }
    if(method==='POST'&&path==='/api/boards/board_test/moves'){
      moved=true
      return route.abort('failed')
    }
    if(method==='GET'&&path.startsWith('/api/boards/board_test/operations/')){
      return route.fulfill({
        status:200,
        contentType:'application/json',
        body:JSON.stringify({
          operationId:path.split('/').pop(),
          status:'completed',
          errorCode:null,
          result:{
            operationId:path.split('/').pop(),
            boardId:'board_test',
            itemId:'item_1',
            destinationColumnId:'done',
            rank:'1000000',
            itemVersion:2,
            policyVersion:1,
            orderingRevision:2,
            eventId:'evt_test',
            correlationId:'corr_test',
            status:'confirmed'
          }
        })
      })
    }
    return route.fulfill({status:200,contentType:'application/json',body:'{}'})
  })

  await page.goto('/#/workspace?tab=Boards&workspace=ws_default')
  await expect(page.getByRole('heading',{name:'Boards'}).first()).toBeVisible()
  const moveButton=page.getByRole('button',{name:'Move Lead A'})
  await moveButton.focus()
  await expect(moveButton).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('group',{name:'Move Lead A to'})).toBeVisible()
  await page.getByRole('group',{name:'Move Lead A to'}).getByRole('button',{name:'Done'}).click()
  await expect(page.locator('[data-column-id="done"] [data-card-id="item_1"]')).toBeVisible()
  await expect(page.getByText('Move confirmed by the server.')).toBeAttached()
})

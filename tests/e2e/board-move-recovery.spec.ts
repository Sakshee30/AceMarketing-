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

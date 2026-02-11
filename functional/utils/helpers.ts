import { Page } from '@playwright/test';

export async function enableMouseOverlay(page: Page) {
  await page.addStyleTag({
    content: `
      .playwright-mouse {
        position: fixed;
        width: 18px;
        height: 18px;
        background: rgba(0, 140, 255, 0.7);
        border-radius: 50%;
        z-index: 999999;
        pointer-events: none;
        transform: translate(-50%, -50%);
      }
    `,
  });

  await page.evaluate(() => {
    const cursor = document.createElement('div');
    cursor.className = 'playwright-mouse';
    document.body.appendChild(cursor);

    document.addEventListener('mousemove', e => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
    });
  });
}

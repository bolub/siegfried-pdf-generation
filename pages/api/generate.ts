// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import chrome from 'chrome-aws-lambda';
import playwright from 'playwright-core';
import path from 'path';
import { FileStorageService } from '@/server/modules/file-storage-service/impl';

type Data = {
  message: string;
  data: any;
};

const RequestBodySchema = z.object({
  html: z.string(),
  userId: z.string(),
  pdfName: z.string(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  let { html, userId, pdfName } = RequestBodySchema.parse(req.body);

  const options = process.env.AWS_REGION
    ? {
        args: chrome.args,
        executablePath: await chrome.executablePath,
        headless: chrome.headless,
      }
    : {
        args: [],
        executablePath:
          process.platform === 'win32'
            ? 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
            : process.platform === 'linux'
            ? '/usr/bin/google-chrome'
            : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      };

  const browser = await playwright.chromium.launch(options);

  const page = await browser.newPage();
  await page.setContent(html);

  const pdfPath = path.join(process.cwd(), 'public', `test.pdf`);
  await page.pdf({ path: pdfPath });

  await browser.close();

  // try to send to supabase
  const supabasePath = `${userId}/${pdfName}_${Date.now()}`;

  const blob = await fetch(pdfPath).then((r) => r.blob());

  try {
    const resp = await FileStorageService.upload({
      bucket: process.env.SUPABASE_CONTRACTS_BUCKET as string,
      path: supabasePath,
      file: blob,
      opts: {
        contentType: 'application/pdf',
      },
    });

    return res.status(200).json({ message: 'ok', data: resp.path });
  } catch (error: any) {
    console.log('Error uploading file: ' + error?.message);

    return res
      .status(500)
      .json({ message: 'Something happened', data: JSON.stringify(error) });
  }
}

// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import puppeteer from 'puppeteer-core';
import path from 'path';
import { FileStorageService } from '@/server/modules/file-storage-service/impl';
import chrome from 'chrome-aws-lambda';

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

  const executablePath = await chrome.executablePath;

  const browser = await puppeteer.launch({
    args: await chrome.args,
    executablePath: executablePath || process.env.PUPPETEER_EXECUTABLE_PATH,
    headless: true,
  });

  const page = await browser.newPage();
  await page.setContent(html);

  const pdfPath = path.join(process.cwd(), 'public', `testt.pdf`);
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

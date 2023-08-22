// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import puppeteer from 'puppeteer-core';
import { FileStorageService } from '@/server/modules/file-storage-service/impl';
import chromium from '@sparticuz/chromium';

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

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
  });

  const page = await browser.newPage();
  await page.setContent(html);

  const pdfBuffer = await page.pdf();
  const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });

  await browser.close();

  // try to send to supabase
  const supabasePath = `${userId}/${pdfName}_${Date.now()}`;

  // const blob = await fetch(pdfPath).then((r) => r.blob());

  try {
    const resp = await FileStorageService.upload({
      bucket: process.env.SUPABASE_CONTRACTS_BUCKET as string,
      path: supabasePath,
      file: pdfBlob,
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

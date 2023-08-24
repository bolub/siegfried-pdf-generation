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
    args: [...chromium.args, '--font-render-hinting=none'],
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
  });

  const page = await browser.newPage();
  await page.setContent(html);
  // await page.addStyleTag({
  //   url: 'https://www.siegfried.dev/_next/static/css/a366c3eda10d4cfe.css',
  // });
  await page.addStyleTag({
    content: `
      <style>
        @font-face {
  font-family: 'DM Sans';
  font-style: normal;
  font-weight: 400;
  src: local('DM Sans'), local('DM Sans'),
    url(<https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,900&display=swap>)
      format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02C6, U+02DA, U+02DC,
    U+2000-206F, U+2074, U+20AC, U+2212, U+2215;
}

      </style>
    `,
  });

  const pdfBuffer = await page.pdf();
  const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });

  await browser.close();

  // try to send to supabase
  const supabasePath = `${userId}/${pdfName}_${Date.now()}`;

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

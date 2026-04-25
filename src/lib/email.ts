import 'server-only'
import nodemailer from 'nodemailer'

const ADMIN_EMAIL = 'rene.miller3@gmail.com'

let cachedTransport: nodemailer.Transporter | null = null

function getTransport(): nodemailer.Transporter | null {
  if (cachedTransport) return cachedTransport
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  if (!user || !pass) return null
  cachedTransport = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  })
  return cachedTransport
}

export async function sendAdminEmail(subject: string, text: string, html?: string): Promise<boolean> {
  return sendEmail(ADMIN_EMAIL, subject, text, html)
}

export async function sendEmail(to: string, subject: string, text: string, html?: string): Promise<boolean> {
  const transport = getTransport()
  if (!transport) {
    console.warn('[email] GMAIL_USER / GMAIL_APP_PASSWORD not set — skipping send.')
    return false
  }
  try {
    await transport.sendMail({
      from: `Seattle Family Bucket List <${process.env.GMAIL_USER}>`,
      to,
      subject,
      text,
      html: html ?? text.replace(/\n/g, '<br>'),
    })
    return true
  } catch (err) {
    console.error('[email] send failed', err)
    return false
  }
}

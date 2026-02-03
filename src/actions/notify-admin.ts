'use server';

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface LeadData {
    nombre: string;
    email: string;
    empresa: string;
}

export async function notifyAdminNewLead(data: LeadData) {
    const results = {
        email: { success: false, error: null as any },
        telegram: { success: false, error: null as any }
    };

    // 1. Intentar enviar Email (Resend)
    try {
        if (process.env.RESEND_API_KEY) {
            const adminEmail = process.env.ADMIN_EMAIL || 'onboarding@resend.dev';
            await resend.emails.send({
                from: 'Eureka Leads <onboarding@resend.dev>',
                to: [adminEmail],
                subject: `🚀 Nuevo Lead: ${data.empresa}`,
                html: `
                    <h2>Nuevo Lead Registrado</h2>
                    <p><strong>Nombre:</strong> ${data.nombre}</p>
                    <p><strong>Email:</strong> ${data.email}</p>
                    <p><strong>Empresa:</strong> ${data.empresa}</p>
                `
            });
            results.email.success = true;
        }
    } catch (err) {
        console.error('Error enviando email:', err);
        results.email.error = err;
    }

    // 2. Intentar enviar Telegram
    try {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;

        if (botToken && chatId) {
            const message = `
🚨 *NUEVO LEAD @ EUREKA* 🚨

👤 *Nombre:* ${data.nombre}
📧 *Email:* ${data.email}
🏢 *Empresa:* ${data.empresa}

_Accede al panel para más detalles._
            `.trim();

            const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

            const response = await fetch(telegramUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    parse_mode: 'Markdown'
                })
            });

            if (!response.ok) {
                throw new Error(`Telegram API Error: ${response.statusText}`);
            }
            results.telegram.success = true;
        } else {
            results.telegram.error = "Faltan credenciales (TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID)";
        }
    } catch (err) {
        console.error('Error enviando Telegram:', err);
        results.telegram.error = err;
    }

    // Retornamos éxito si AL MENOS UNO funcionó (o si simplemente terminamos de intentar)
    return { success: true, results };
}

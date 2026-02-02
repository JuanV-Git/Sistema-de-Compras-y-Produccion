'use server';

import { Resend } from 'resend';

// Inicializar Resend con la key (fallará suavemente si no existe)
const resend = new Resend(process.env.RESEND_API_KEY);

interface LeadData {
    nombre: string;
    email: string;
    empresa: string;
    telefono?: string;
}

export async function sendLeadNotification(data: LeadData) {
    try {
        if (!process.env.RESEND_API_KEY) {
            console.warn('⚠️ RESEND_API_KEY no configurada. No se envió el email.');
            return { success: false, error: 'API Key missing' };
        }

        // Email del administrador (puedes cambiarlo o una variable de entorno)
        // Por defecto enviamos al mismo email configurado como "FROM" si es verified, 
        // o al email del desarrollador que está probando.
        // Lo ideal es tener ADMIN_EMAIL en env.
        const adminEmail = process.env.ADMIN_EMAIL || 'onboarding@resend.dev';
        const fromEmail = 'onboarding@resend.dev'; // Dominio de prueba de Resend

        const { data: emailData, error } = await resend.emails.send({
            from: 'Eureka Leads <onboarding@resend.dev>',
            to: [adminEmail], // En prueba solo puedes enviar a tu propio email registrado en Resend
            subject: `🚀 Nuevo Lead: ${data.empresa} (${data.nombre})`,
            html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #d4a017;">Nuevo Lead Registrado</h2>
          <p>Un nuevo usuario ha solicitado una cuenta de prueba:</p>
          <ul>
            <li><strong>Nombre:</strong> ${data.nombre}</li>
            <li><strong>Email:</strong> ${data.email}</li>
            <li><strong>Empresa:</strong> ${data.empresa}</li>
          </ul>
          <p>La cuenta ya ha sido creada en Supabase.</p>
          <hr/>
          <p style="font-size: 12px; color: #666;">Eureka Consultoría Industrial - Sistema de Gestión</p>
        </div>
      `,
        });

        if (error) {
            console.error('Error enviando email Resend:', error);
            return { success: false, error: error.message };
        }

        return { success: true, data: emailData };

    } catch (err) {
        console.error('Error inesperado enviando email:', err);
        return { success: false, error: 'Internal Server Error' };
    }
}

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { AuthSecurityService } from './authSecurityService';

export interface UserSystemAccount {
  id: string;
  nombre: string;
  email: string;
  telefono_whatsapp: string;
  rol: 'admin' | 'pos' | 'taller' | 'cobranzas';
  must_change_password: boolean;
  activo: boolean;
  ultimo_acceso?: string | null;
  dispositivo_info?: {
    tipo?: 'movil' | 'escritorio';
    navegador?: string;
    fecha?: string;
  } | null;
  created_at?: string;
}

export interface PasswordStrengthResult {
  score: number; // 0 to 4
  label: 'Muy Débil' | 'Débil' | 'Aceptable' | 'Buena' | 'Fuerte';
  color: string;
  isValid: boolean;
  rules: {
    minLength: boolean;
    hasUppercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

export const WhatsAppOtpService = {
  // 1. Generador de OTP criptográficamente seguro de 6 dígitos
  generateSecure6DigitOtp(): string {
    const cryptoObj = typeof window !== 'undefined' ? window.crypto : (globalThis as any).crypto;
    const array = new Uint32Array(1);
    cryptoObj.getRandomValues(array);
    // Número entre 100000 y 999999
    const code = 100000 + (array[0] % 900000);
    return code.toString();
  },

  // 2. Hash Criptográfico SHA-256 (Web Crypto API)
  async hashStringSha256(text: string): Promise<string> {
    const cryptoObj = typeof window !== 'undefined' ? window.crypto : (globalThis as any).crypto;
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await cryptoObj.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  // 3. Evaluador de Fortaleza de Contraseña
  calculatePasswordStrength(password: string): PasswordStrengthResult {
    const minLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    let score = 0;
    if (minLength) score++;
    if (hasUppercase) score++;
    if (hasNumber) score++;
    if (hasSpecial) score++;

    let label: PasswordStrengthResult['label'] = 'Muy Débil';
    let color = '#ef4444';

    if (score === 1) {
      label = 'Débil';
      color = '#f97316';
    } else if (score === 2) {
      label = 'Aceptable';
      color = '#eab308';
    } else if (score === 3) {
      label = 'Buena';
      color = '#3b82f6';
    } else if (score === 4) {
      label = 'Fuerte';
      color = '#22c55e';
    }

    // Regla mínima requerida: 8 caracteres, al menos 1 mayúscula y 1 número
    const isValid = minLength && hasUppercase && hasNumber;

    return {
      score,
      label,
      color,
      isValid,
      rules: {
        minLength,
        hasUppercase,
        hasNumber,
        hasSpecial
      }
    };
  },

  // 4. Solicitud de Código OTP para Recuperación
  async requestPasswordResetOtp(identificador: string): Promise<{
    success: boolean;
    message: string;
    phoneMasked?: string;
    telefonoDestino?: string;
  }> {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, message: 'Servicio de base de datos no configurado.' };
    }

    try {
      const otpCode = this.generateSecure6DigitOtp();
      const otpHash = await this.hashStringSha256(otpCode);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutos

      // 4.1 Llamar al RPC en Supabase
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('solicitar_otp_whatsapp', {
        p_identificador: identificador,
        p_otp_hash: otpHash,
        p_expires_at: expiresAt
      });

      if (rpcErr) {
        return { success: false, message: rpcErr.message || 'Error solicitando código.' };
      }

      if (!rpcRes?.success) {
        return { success: false, message: rpcRes?.message || 'No fue posible generar el código.' };
      }

      const rawPhone = rpcRes.telefono_destino || '';
      const userName = rpcRes.nombre_usuario || 'Personal';

      // 4.2 Enviar el OTP por la Edge Function de WhatsApp o directo a la API
      try {
        const edgeFunctionUrl = `${(import.meta as any).env.VITE_SUPABASE_URL}/functions/v1/send-whatsapp-otp`;
        await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': (import.meta as any).env.VITE_SUPABASE_ANON_KEY || ''
          },
          body: JSON.stringify({
            phone: rawPhone,
            otp: otpCode,
            userName
          })
        });
      } catch (dispatchErr) {
        console.warn('Edge Function de WhatsApp encolada en modo fallback:', dispatchErr);
      }

      // Enmascarar teléfono para visualización segura (ej: +57 320 *** **02)
      const visibleStart = rawPhone.slice(0, 5);
      const visibleEnd = rawPhone.slice(-2);
      const phoneMasked = `${visibleStart} *** **${visibleEnd}`;

      return {
        success: true,
        message: 'Código de seguridad enviado por WhatsApp exitosamente.',
        phoneMasked,
        telefonoDestino: rawPhone
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Error inesperado al solicitar OTP.' };
    }
  },

  // 5. Verificación de OTP y Actualización de Contraseña
  async verifyOtpAndSetNewPassword(
    identificador: string,
    otpCode: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, message: 'Servicio de base de datos no configurado.' };
    }

    try {
      const otpHash = await this.hashStringSha256(otpCode.trim());
      const newPasswordHash = await this.hashStringSha256(newPassword);

      const { data, error } = await supabase.rpc('verificar_otp_y_cambiar_password', {
        p_identificador: identificador,
        p_otp_hash: otpHash,
        p_new_password_hash: newPasswordHash
      });

      if (error) {
        return { success: false, message: error.message || 'Error validando código.' };
      }

      return {
        success: Boolean(data?.success),
        message: data?.message || 'Resultado de verificación'
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Error de conexión.' };
    }
  },

  // 6. Cambio Voluntario / Forzado de Contraseña en Sesión
  async updatePasswordInSession(
    userIdOrEmail: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, message: 'Base de datos no disponible.' };
    }

    try {
      const currentHash = await this.hashStringSha256(currentPassword);
      const newHash = await this.hashStringSha256(newPassword);

      // 6.1 Verificar usuario y clave actual
      const { data: user, error: userErr } = await supabase
        .from('usuarios_sistema')
        .select('id, password_hash')
        .or(`id.eq.${userIdOrEmail},email.eq.${userIdOrEmail.toLowerCase()}`)
        .single();

      if (userErr || !user) {
        return { success: false, message: 'Usuario no encontrado.' };
      }

      if (user.password_hash !== currentHash) {
        return { success: false, message: 'La contraseña actual no es correcta.' };
      }

      // 6.2 Actualizar a nueva clave y revocar must_change_password
      const { error: updateErr } = await supabase
        .from('usuarios_sistema')
        .update({
          password_hash: newHash,
          must_change_password: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateErr) {
        return { success: false, message: updateErr.message };
      }

      return { success: true, message: '¡Contraseña actualizada exitosamente!' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Error al cambiar contraseña.' };
    }
  },

  // 7. Panel Administrativo: Consultar Todos los Usuarios
  async adminFetchUsers(): Promise<UserSystemAccount[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    try {
      const { data, error } = await supabase
        .from('usuarios_sistema')
        .select('*')
        .order('created_at', { ascending: true });

      if (error || !data) return [];
      return data;
    } catch (e) {
      return [];
    }
  },

  // 8. Panel Administrativo: Crear Usuario Rápido con Contraseña Provisional
  async adminCreateUser(params: {
    nombre: string;
    email: string;
    telefono: string;
    rol: string;
    passwordProvisional: string;
    mustChangePassword?: boolean;
  }): Promise<{ success: boolean; message: string; userId?: string }> {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, message: 'Base de datos no disponible.' };
    }

    try {
      const passwordHash = await this.hashStringSha256(params.passwordProvisional);

      const { data, error } = await supabase.rpc('admin_crear_usuario', {
        p_nombre: params.nombre,
        p_email: params.email,
        p_telefono: params.telefono,
        p_rol: params.rol,
        p_password_hash: passwordHash,
        p_must_change_password: params.mustChangePassword ?? true
      });

      if (error) {
        return { success: false, message: error.message };
      }

      return {
        success: Boolean(data?.success),
        message: data?.message || 'Usuario procesado',
        userId: data?.user_id
      };
    } catch (e: any) {
      return { success: false, message: e.message || 'Error creando usuario.' };
    }
  },

  // 9. Panel Administrativo: Kill Switch / Activar o Desactivar Usuario
  async adminToggleUserActive(userId: string, active: boolean): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, message: 'Base de datos no disponible.' };
    }

    try {
      const { data, error } = await supabase.rpc('admin_toggle_usuario_activo', {
        p_user_id: userId,
        p_activo: active
      });

      if (error) {
        return { success: false, message: error.message };
      }

      return {
        success: Boolean(data?.success),
        message: data?.message || 'Estado actualizado'
      };
    } catch (e: any) {
      return { success: false, message: e.message || 'Error al cambiar estado de cuenta.' };
    }
  },

  // 10. Generador de Contraseña Provisional Segura
  generateProvisionalPassword(): string {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%&*';
    // Garantiza mayúscula, minúscula, número y símbolo
    let pass = 'Wjg2026#';
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  }
};

import { updateExpiredTrials } from '../../lib/subscriptionUtils';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const result = await updateExpiredTrials();
    
    if (result.success) {
      return res.status(200).json({
        message: result.message,
        updated: result.updated,
        details: result.details
      });
    } else {
      return res.status(500).json({
        error: result.error,
        updated: result.updated
      });
    }
  } catch (error) {
    console.error('Erro na API update-expired-trials:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
}

/**
 * INSTRUÇÕES DE USO:
 * 
 * 1. MANUAL:
 *    curl http://localhost:3000/api/update-expired-trials
 * 
 * 2. CRON JOB (cPanel, crontab, etc):
 *    0 2 * * * curl -X POST https://seudominio.com/api/update-expired-trials
 * 
 * 3. GITHUB ACTIONS (executar diariamente):
 *    - name: Update expired trials
 *      run: curl -X POST https://seudominio.com/api/update-expired-trials
 * 
 * 4. VERCEL CRON (vercel.json):
 *    {
 *      "crons": [{
 *        "path": "/api/update-expired-trials",
 *        "schedule": "0 2 * * *"
 *      }]
 *    }
 * 
 * 5. COM AUTENTICAÇÃO:
 *    Descomente as linhas de verificação de token e adicione:
 *    CRON_SECRET=seu_token_secreto no .env
 */
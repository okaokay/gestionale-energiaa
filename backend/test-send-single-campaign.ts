import { sendSingleCampaign } from './cron/campaignScheduler';

async function testSendSingleCampaign() {
    console.log('🧪 Test diretto sendSingleCampaign...');
    
    const campaignId = 'c71337e0-4cc2-4055-8c2d-4baa0aa31c65';
    
    try {
        const result = await sendSingleCampaign(campaignId);
        console.log('📊 Risultato:', result);
    } catch (error) {
        console.error('❌ Errore:', error);
    }
}

testSendSingleCampaign();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Apify API token'ınızı buraya girin (veya environment variable kullanın)
const APIFY_TOKEN = 'apify_api_bB6eRptWMu5bXKAgSjUL6KwyMsnkcF47mSKD';

// Instagram verilerini Apify API üzerinden çek
app.get('/api/instagram/:username', async (req, res) => {
    const username = req.params.username;
    
    try {
        // 1. Apify'da Instagram Scraper actor'ünü çağır (actor: apify/instagram-scraper)
        const actorCallResponse = await axios.post(
            `https://api.apify.com/v2/acts/apify~instagram-scraper/runs?token=${APIFY_TOKEN}`,
            {
                "username": [username], // Apify actor'ü genelde array olarak ister
                "resultsLimit": 12       // Son 12 gönderi
            },
            {
                headers: { 'Content-Type': 'application/json' }
            }
        );

        const runId = actorCallResponse.data.data.id;
        
        // 2. Run'ın tamamlanmasını bekle (basit polling)
        let runFinished = false;
        let datasetId = null;
        while (!runFinished) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2 saniye bekle
            
            const runStatusResponse = await axios.get(
                `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
            );
            const status = runStatusResponse.data.data.status;
            
            if (status === 'SUCCEEDED') {
                runFinished = true;
                datasetId = runStatusResponse.data.data.defaultDatasetId;
            } else if (status === 'FAILED' || status === 'TIMED-OUT' || status === 'ABORTED') {
                throw new Error('Apify run başarısız oldu.');
            }
        }
        
        // 3. Dataset'ten sonuçları al
        const datasetResponse = await axios.get(
            `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`
        );
        
        const data = datasetResponse.data;
        
        // Apify çıktısı genellikle bir dizi obje, ilk eleman profil bilgisi
        if (!data || data.length === 0) {
            return res.status(404).json({ error: 'Veri bulunamadı' });
        }
        
        const profile = data[0]; // İlk eleman profil
        
        // Gönderi resimlerini topla
        const posts = (profile.posts || []).slice(0, 12).map(post => post.displayUrl || post.url);
        
        res.json({
            success: true,
            businessName: profile.fullName || profile.username,
            profilePic: profile.profilePicUrl || '',
            bio: profile.biography || '',
            posts: posts
        });
        
    } catch (error) {
        console.error('Apify API hatası:', error.response?.data || error.message);
        res.status(500).json({ error: 'Veri çekilemedi: ' + (error.response?.data?.message || error.message) });
    }
});

// Ana sayfa için yedek route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

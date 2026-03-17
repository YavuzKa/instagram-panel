const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000; // Render'ın atadığı portu kullan

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/instagram/:username', async (req, res) => {
    const username = req.params.username;
    try {
        const response = await axios.get(`https://www.instagram.com/${username}/`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const html = response.data;
        const regex = /<script type="text\/javascript">window\._sharedData = (.*?);<\/script>/;
        const match = html.match(regex);
        if (!match) return res.status(404).json({ error: 'Veri bulunamadı' });
        const jsonData = JSON.parse(match[1]);
        const user = jsonData.entry_data.ProfilePage[0].graphql.user;
        const posts = user.edge_owner_to_timeline_media.edges.slice(0, 12).map(edge => edge.node.display_url);
        res.json({
            success: true,
            businessName: user.full_name || user.username,
            profilePic: user.profile_pic_url_hd || user.profile_pic_url,
            bio: user.biography,
            posts: posts
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => console.log(`Sunucu çalışıyor: ${PORT}`));

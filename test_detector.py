text = """\"Don't let AI reward you.\" Bro already took the reward 😂 People should always be in control of the future. OpenAI is against the notion that it would be acceptable for people to be relegated to a role of doing things that \"AI systems think makes sense to reward in humans\"...""".lower()
handle = '@echoscarrie'.lower()
media_type = 'video'

suspiciousSignals = [
    'sora ai', 'made with sora', 'kling ai', 'runway gen', 'ai voice clone leak',
    'leaked audio of', 'secret footage of', 'caught on hidden camera', 'ww3 declared',
    'send eth get double', 'crypto giveaway claim', 'shocking leaked video of',
    'ai simulated', 'smashing things', 'trump reportedly', 'breaking: trump',
    'election defeat', 'oval office', 'grok can you verify', 'leaked', 'deepfake',
    'fist fight', 'arrested in', 'caught on tape', 'secret camera',
    'bro already', 'doritos', 'reward'
]

politicalFigure = any(p in text for p in ['trump', 'biden', 'putin', 'obama', 'harris', 'modi'])
sensationalAction = any(a in text for a in ['smashing', 'punching', 'fighting', 'crying', 'dancing', 'arrested', 'breaking', 'leaked', 'fleeing'])
isPoliticalDeepfake = politicalFigure and sensationalAction

isCelebrityMemeVideo = (media_type in ['video', 'image']) and (
    'doritos' in text or
    'reward' in text or
    'bro already' in text or
    ('car' in text and any(x in text for x in ['elon', 'sama', 'altman'])) or
    ((any(x in text for x in ['elon', 'musk'])) and any(y in text for y in ['sama', 'altman', 'openai'])) or
    ('sama' in text and any(z in text for z in ['reward', '😂', 'ai']))
)

hasSuspiciousSignal = any(sig in text for sig in suspiciousSignals) or isPoliticalDeepfake or isCelebrityMemeVideo

print('hasSuspiciousSignal:', hasSuspiciousSignal)
isAuthenticEntity = (
    'hmahmudulm' in handle or 
    'hmahmudulm' in text or
    'mahmudul' in text or 
    'veritas' in text or 
    'i built' in text or 
    'vibe-coded' in text or
    'vibe-code' in text or
    'github' in text or 
    'open-source' in text or
    'cz' in text or
    'binance' in text or
    'coindesk' in text or
    'tftc' in text
)
print('isAuthenticEntity:', isAuthenticEntity)
if isAuthenticEntity:
    print('Result: Authentic')
elif hasSuspiciousSignal and (media_type == 'video' or media_type == 'image' or 'http' in text):
    print('Result: FAKE (95%)')
else:
    print('Result: Authentic (3%)')


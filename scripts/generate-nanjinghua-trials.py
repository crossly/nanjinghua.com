from pathlib import Path

from mlx_audio.tts.generate import generate_audio
from mlx_audio.tts.utils import load_model


MODEL_ID = "mlx-community/Qwen3-TTS-12Hz-1.7B-VoiceDesign-4bit"
OUTPUT_DIR = Path("public/audio/nanjinghua-trials")
VOICE_DESCRIPTION = (
	"匿名的南京本地中年女性，自然日常交流，不模仿任何真实人物；"
	"使用南京话口音，语速自然，清楚但不使用播音腔。"
)

TRIALS = (
	("jigongjiao", "后头空得很，往里走走。", "像公交车上的乘客顺口提醒大家。"),
	("lane", "上哪块去啊？", "像巷口邻居偶遇时随口招呼。"),
	("shop", "老板，这个怎么卖啊？", "像小店顾客自然询价。"),
	("market", "便宜一得儿行啊？", "像菜场顾客友好地商量价格。"),
	("breakfast", "阿要辣油啊？", "像早点铺摊主顺口询问熟客。"),
	("kitchen", "莫搁盐了，够咸了。", "像家人在厨房里自然提醒。"),
	("downstairs", "今个蛮凉快的。", "像邻居坐在楼下闲聊。"),
	("school-gate", "今个作业多不多啊？", "像家长在校门口接到孩子后询问。"),
	("playground", "还差一个，阿有人来？", "像球友在操场边招呼人加入。"),
	("new-estate", "电梯等一哈。", "像邻居赶电梯时自然招呼。"),
	("phone-screen", "你到哪块了？", "像家人在电话里询问位置。"),
	("stage", "开场了，快坐得。", "像观众在小戏台前提醒同行人。"),
	("desk", "这本你看到哪块了？", "像两个人在书桌前一起查资料。"),
	("festival-street", "人多得不得了。", "像同行人刚走进灯会街口时感叹。"),
	("station", "票证带了啊？", "像送行人在进站前关心地确认。"),
)


def main() -> None:
	OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
	model = load_model(MODEL_ID)

	for slug, text, context in TRIALS:
		generate_audio(
			text=text,
			model=model,
			instruct=f"{VOICE_DESCRIPTION}{context}",
			lang_code="Chinese",
			output_path=str(OUTPUT_DIR),
			file_prefix=slug,
			audio_format="wav",
			max_tokens=180,
			verbose=False,
		)
		generated = OUTPUT_DIR / f"{slug}_000.wav"
		generated.replace(OUTPUT_DIR / f"{slug}.wav")


if __name__ == "__main__":
	main()

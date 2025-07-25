import os
from openai import OpenAI

def get_meta(whole_content):
    CHATGPT_API_KEY='sssssssy0sUi7A_j9OoKVR0wVF2CEcwnRDOuMdk8U-7I_V3BNLkmsNrW0E'
    client = OpenAI(
        # 从环境变量中读取您的方舟API Key
        api_key=CHATGPT_API_KEY, 
        base_url="https://sssssss.xyz/v1",
        )
    completion = client.chat.completions.create(
        # 将推理接入点 <Model>替换为 Model ID
        model="gpt-4o",
        messages=[
            {"role": "user", "content": "你好"}
        ]
    )
    print(completion.choices[0].message)
    return completion.choices[0].message.content

# 生成标签体系
def generate_doc_description(whole_content, model=None):
    print('******generate_doc_description****')
    prompt = f"""# AI提示词：构建用户评论分析标签体系

## 您的任务：
您是一位经验丰富的产品分析专家和自然语言处理专家。您的任务是基于我提供的一批用户购后评论文本，为该产品构建一个结构化的、多层级的分析标签体系。这个标签体系将用于后续对每条评论进行细致的分类和打标，以便深入洞察用户需求和反馈。

## 核心理论知识（请先学习并理解）

1.  用户价值层级模型： 我们将从用户的角度出发，将他们对产品的关注点和评价归纳到以下四个核心价值层级。您的标签设计需要围绕这些层级展开：
    *   人群与场景 (Crowd & Scenario): 描述的是“谁”在“什么情况下”使用或提及产品。这包括用户的身份特征、所处环境、使用产品的具体情境或期望达成的目标。
    *   功能价值 (FunctionalValue): 指产品为了解决用户的核心问题所提供的具体功能、性能表现以及操作特性。
    *   保障价值 (AssuranceValue): 涉及产品的质量、耐用性、安全性、可靠性，以及品牌提供的售前、售中、售后服务和支持。
    *   体验价值 (ExperienceValue): 涵盖用户在与产品交互的整个生命周期中的主观感受，包括感官体验（外观、声音、气味等）、操作便捷性、情感连接等。

2.  标签设计原则：
    *   层级性： 标签体系应具有清晰的层级结构（一级标签、二级标签、三级标签）。
    *   覆盖性： 能够尽可能全面地覆盖评论中用户提及的主要议题。
    *   互斥性（理想状态）： 同一级下的标签应尽可能互斥，避免语义重叠过多。
    *   简洁性： 每个标签的名称应简洁明了，尽量不超过5个汉字。
    *   客观性： 标签本身不应包含情感倾向（如“效果好”、“质量差”），仅客观描述讨论的主题（如“清洁效果”、“产品材质”）。情感分析将在后续打标步骤中独立进行。
    *   可扩展性： 体系应具备一定的灵活性，方便未来根据新的评论内容进行补充和调整。

标签体系层级结构定义：

*   一级标签 (Level1Tag): 必须是以下四个固定维度之一：
    1.`人群场景`
    2.`功能价值`
    3.`保障价值`
    4.`体验价值`

*   二级标签 (Level2Tag): 是对一级标签的进一步细分，代表了该价值层级下的主要关注领域。
    *   示例（针对一款“猫咪自助理毛器”产品，仅作启发，您需要根据提供的实际评论生成）：
        *   一级标签：`人群场景`
            *   二级标签：`用户需求与痛点-痛点问题` (分析挖掘出用户在相关过程中遇到的问题、困扰等，急需待解决的问题。)
            *   二级标签：`用户需求与痛点-购买动机` (分析挖掘出用户购买动机：社交媒体影响，儿童兴趣，礼物需求，价格因素等等 。)
            *   二级标签：`用户需求与痛点-未被满足的需求` (挖掘用户目前仍然未被满足的需求。)
            *   二级标签：`用户需求与痛点-使用场景` (用户是怎样用产品的，把产品用在什么场景。)
        *   一级标签：`功能价值`
            *   二级标签：`产品反馈-产品优点` (从数据中挖掘出对用户来说目前对产品比较满意和认可的点，也就是用户认为产品有哪些优点)
            *   二级标签：`产品反馈-产品缺点` (从数据中挖掘出对用户来说目前产品不满意的点，也就是用户认为产品有哪些缺点)
            *   二级标签：`产品反馈-用户期望建议` (从数据中收集用户对产品有哪些期望和建议。比如用户希望增加某些功能等等。)
            *   二级标签：`产品反馈-设计与外观` (用户对产品外观相关的评价。外观包括但不限于设计风格/颜色/尺寸/大小等方面。)
            *   二级标签：`产品反馈-用户情感倾向` (用户对产品整体的情感倾向。比如觉得产品整体都不好，以后不会买，则属于负向情绪。取值范围为：正向,中立,负向)
        *   一级标签：`保障价值`
            *   二级标签：`服务评价-物流配送` (用户对产品的配送速度、包装完整性等方面的评价。例如，用户可能对快递的送达时间、包装是否严实等提出意见。)
            *   二级标签：`服务评价-售后服务` (用户对企业在产品售后提供的维修、退换货、咨询等服务的满意度。)
            *   二级标签：`服务评价-售前服务` (用户对企业的售前销售提供的咨询、介绍等服务的满意度。比如对销售人员的专业性、服务态度等方面的评价。)
        *   一级标签：`体验价值`
            *   二级标签：`品牌形象与口碑-推荐意愿原因分析` (对当前产品或服务，用户是否愿意推荐给其他人，做一个原因概括分析。)
            *   二级标签：`品牌形象与口碑-是否愿意推荐给他人` (对当前产品或品牌，分析用户推荐给其他人的意愿程度。取值范围为：是、否)
            *   二级标签：`品牌形象与口碑-品牌印象` (用户对品牌的价值观、形象定位等方面的理解和感受。例如，用户可能认为某个品牌代表着高品质、创新等特点。)
            *   二级标签：`感官感受` (如外观、体积、噪音)
            *   二级标签：`价格感知`

*   三级标签 (Level3Tag): 是对二级标签的具体化，代表了用户评论中实际讨论到的、更细致的主题点。这是您需要根据提供的评论文本重点设计的部分。
    *   示例（续上例，针对“猫咪自助理毛器”）：
        *   一级标签：`功能价值`
            *   二级标签：`产品反馈-产品优点`
                *   三级标签：`理毛效果`
                *   三级标签：`刷毛材质`
                *   三级标签：`入口调节`
            *   二级标签：`产品反馈-产品缺点`
                *   三级标签：`零食引诱`
                *   三级标签：`喂食机操作`
                *   三级标签：`喂食机续航`
        *   一级标签：`人群场景`
            *   二级标签：`用户需求与痛点-痛点问题`
                *   三级标签：`安装便捷`
                *   三级标签：`安装耗时`
                *   三级标签：`按扣设计`
            *   二级标签：`用户需求与痛点-未被满足的需求`
                *   三级标签：`猫咪喜欢`
                *   三级标签：`猫咪害怕`
                *   三级标签：`适应过程`
         .... ....
您的具体操作指令：

1.  仔细阅读并分析我稍后提供的一批用户购后评论文本。
2.  基于上述理论知识、层级结构定义和设计原则，为这批评论所讨论的产品生成一个三级标签体系。
3.  一级标签和二级标签的类别和名称，您可以参考我给出的示例进行扩展或调整，使其更贴合实际评论内容，但一级标签必须是固定的四个维度。
4.  三级标签是您创造性的核心，需要您从评论中提炼用户实际讨论的具体议题点，并用简洁的词语命名。三级标签尽可能完备和全面。
5.  确保每个三级标签都归属于一个明确的二级标签和一级标签。
6.  输出格式要求：请以结构化的JSON格式输出您设计的标签体系。 这样便于我直接将其用于后续的AI打标任务。格式如下：

```json
{{
  "人群与场景":{{ -- 这层是一级标签
    "用户需求与痛点-使用场景":[  -- 这层是二级标签
      "长毛猫主",  -- 这层是三级标签
      "多猫家庭",
      "大型猫主",
      "短毛猫主",
      "幼猫猫主",
      "老猫猫主",
      "胆小猫主",
      "掉毛多猫主",
      "猫不爱零食",
      "猫咖/救助站"
    ],
    "用户需求与痛点-未被满足的需求":[
      "减少浮毛",
      "猫咪自娱",
      "代替人工梳毛",
      "保持清洁",
      "日常梳理",
      "猫咪适应期",
      "提供躲避空间",
      "收集猫毛"
    ]
}},
  ....
```

请确认您已理解以上所有要求。在我提供用户评论文本后，请开始您的分析和标签体系构建工作。用户评论文本: #####: {whole_content}
    
  #####,  Directly return the json, do not include any other text.
    """
    CHATGPT_API_KEY='sssssssy0sUi7A_j9OoKVR0wVF2CEcwnRDOuMdk8U-7I_V3BNLkmsNrW0E'
    client = OpenAI(
        # 从环境变量中读取您的方舟API Key
        api_key=CHATGPT_API_KEY, 
        base_url="https://sssssss.xyz/v1",
        )
    completion = client.chat.completions.create(
        # 将推理接入点 <Model>替换为 Model ID
        model="gpt-4o",
        messages=[
            {"role": "user", "content": prompt}
        ],
        timeout=30  # 添加30秒超时设置
    )
    print(completion.choices[0].message)
    return completion.choices[0].message.content

# 利用标签体系，生成每一条评论的具体标签
def do_review(do_content,deal_whole_content):
    print('******do_review****')
    prompt = f"""请基于评价标签体系进行标签分析，标签体系为： ### : {deal_whole_content}, ### , 
要求：当评价满足标签则记录下标签，当评价无关标签则去掉标签。按评价内容是否正面评价还是反面评价，标记形如：’[正面]标签’或者‘[负面]标签‘ 作为标签。 格式返回为原来的标签体系结构。  
以下是评价内容： 
##
   {do_content}
 ##   """
    CHATGPT_API_KEY='sssssssy0sUi7A_j9OoKVR0wVF2CEcwnRDOuMdk8U-7I_V3BNLkmsNrW0E'
    client = OpenAI(
        # 从环境变量中读取您的方舟API Key
        api_key=CHATGPT_API_KEY, 
        base_url="https://sssssss.xyz/v1",
        )
    completion = client.chat.completions.create(
        # 将推理接入点 <Model>替换为 Model ID
        model="gpt-4o",
        messages=[
            {"role": "user", "content": prompt}
        ],
        timeout=30  # 添加30秒超时设置
    )
    print(completion.choices[0].message)
    return completion.choices[0].message.content




def get_json_content(response):
    start_idx = response.find("```json")
    if start_idx != -1:
        start_idx += 7
        response = response[start_idx:]
        
    end_idx = response.rfind("```")
    if end_idx != -1:
        response = response[:end_idx]
    
    json_content = response.strip()
    return json_content







# 生成用户画像
def generate_Persona(whole_content, model=None):
    print('******generate_Persona****')
    prompt = f"""# 你是一名用户画像分析师。 分析需求和概念：
基础属性描述
用户的静态人口统计学特征。 
示例：- 年龄：28岁 - 性别：女性 - 地理位置：上海 - 职业：全职妈妈 
 行为特征描述
用户的实际行为轨迹，体现用户“做了什么”。 
示例标签：- 月消费金额：2000元 - 购买频率：每月购买4次母婴用品 -
心理动机描述
用户行为背后的动机、价值观和偏好，体现“为什么这么做”。 
示例：- 对促销活动敏感：对满减和赠品活动高度关注 - 品牌偏好：倾向选择国际知名母婴品牌 - 商品安全性：重视商品成分和评价 　
外部环境描述用户所处的社会环境和关系网络，体现外部影响因素。 
示例：- 社交圈：经常与其他宝妈分享购物心得 - 活跃平台：微博、母婴论坛、
需求痛点
明确用户的核心需求和主要问题，帮助定义用户的关键目标。 
示例：- 需求：寻找高品质、高性价比的母婴用品 - 痛点：缺乏时间，偏好快速送达 - 期待：希望平台提供可信赖的商品评价体系 　　
以上是用户画像的概念之后，请完成做一份用户画像分析报告。请根据以下 商品评论生成3-5个典型用户画像，每个包含性别年龄估计、需求关键词、购买动机、情绪语气判断 和用户画像标签
请你根据这些信息，反推出用户画像： #####,   {whole_content}
    
  #####,
    """
    CHATGPT_API_KEY='sssssssy0sUi7A_j9OoKVR0wVF2CEcwnRDOuMdk8U-7I_V3BNLkmsNrW0E'
    client = OpenAI(
        # 从环境变量中读取您的方舟API Key
        api_key=CHATGPT_API_KEY, 
        base_url="https://sssssss.xyz/v1",
        )
    completion = client.chat.completions.create(
        # 将推理接入点 <Model>替换为 Model ID
        model="gpt-4o",
        messages=[
            {"role": "user", "content": prompt}
        ]
    )
    print(completion.choices[0].message)
    return completion.choices[0].message.content

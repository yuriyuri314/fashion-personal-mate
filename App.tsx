/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Sparkles, 
  MapPin, 
  Heart, 
  Ruler, 
  Palette, 
  Smile, 
  Star, 
  Bookmark,
  ChevronRight,
  Loader2,
  Trash2,
  Plus
} from 'lucide-react';
import { UserProfile, OutfitSuggestion, BodyShape, StylePreference, Mood, TPO } from './types';
import { generateOutfitRecommendation, generateTPOTip } from './services/geminiService';

type Tab = 'profile' | 'recommend' | 'tpo' | 'closet';
type AppStep = 'start' | 'diagnosis' | 'result' | 'profile' | 'main';

const DIAGNOSIS_QUESTIONS = [
  {
    id: 'widths',
    question: '어깨와 엉덩이 중 어디가 더 넓나요?',
    options: [
      { label: '어깨가 더 넓어요', value: 'shoulder' },
      { label: '엉덩이가 더 넓어요', value: 'hip' },
      { label: '둘이 비슷해요', value: 'similar' }
    ]
  },
  {
    id: 'waist',
    question: '허리가 잘록한 편인가요?',
    options: [
      { label: '네, 아주 잘록해요', value: 'very' },
      { label: '약간 있는 편이에요', value: 'bit' },
      { label: '거의 일자에 가까워요', value: 'none' }
    ]
  },
  {
    id: 'weight',
    question: '살이 주로 어디에 붙나요?',
    options: [
      { label: '상체(얼굴, 팔, 배)', value: 'top' },
      { label: '하체(허벅지, 엉덩이)', value: 'bottom' },
      { label: '전체적으로 골고루', value: 'even' }
    ]
  },
  {
    id: 'silhouette',
    question: '전체적인 실루엣이 어떤가요?',
    options: [
      { label: '상체가 발달한 체형', value: 'top-heavy' },
      { label: '하체가 발달한 체형', value: 'bottom-heavy' },
      { label: '위아래 균형 잡힌 체형', value: 'balanced' }
    ]
  }
];

const BODY_SHAPE_INFO: Record<BodyShape, { title: string, desc: string, icon: string, color: string }> = {
  Triangle: { title: '삼각형', desc: '하체가 상체보다 발달한 체형이에요. 시선을 상체로 끌어올리는 코디가 찰떡!', icon: '🔼', color: 'bg-mint-100' },
  InvertedTriangle: { title: '역삼각형', desc: '어깨가 발달하고 하체가 슬림한 체형이에요. 하단에 볼륨을 주는 스타일을 추천해요!', icon: '🔽', color: 'bg-blue-100' },
  Rectangle: { title: '직사각형', desc: '어깨와 골반 너비가 비슷하고 허리 라인이 일자인 체형이에요. 벨트로 라인을 만들어보세요!', icon: '▮', color: 'bg-slate-100' },
  Hourglass: { title: '모래시계형', desc: '어깨와 엉덩이 비율이 좋고 허리가 잘록한 체형이에요. 몸의 곡선을 살리는 핏한 옷이 예뻐요!', icon: '⏳', color: 'bg-pink-100' },
  Apple: { title: '사과형', desc: '상체와 복부에 살이 집중되고 다리가 슬림한 체형이에요. V넥과 루즈핏 상의가 베스트!', icon: '🍎', color: 'bg-red-100' },
  BottomHeavy: { title: '하체형', desc: '전체적으로 날씬하지만 골반과 허벅지가 강조된 체형이에요. 와이드 팬츠나 A라인 스커트를 활용해보세요!', icon: '🍑', color: 'bg-orange-100' }
};

export default function App() {
  const [step, setStep] = useState<AppStep>('start');
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [diagnosisStep, setDiagnosisStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  const [profile, setProfile] = useState<UserProfile>({
    height: '160',
    bodyShape: 'Rectangle',
    style: 'Casual',
    mood: 'Excitement',
    isBeginner: true
  });
  
  const [suggestions, setSuggestions] = useState<OutfitSuggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [closet, setCloset] = useState<OutfitSuggestion[]>([]);
  const [tpoContent, setTpoContent] = useState<Record<string, string>>({});
  const [activeTPO, setActiveTPO] = useState<TPO>('Date');

  // Load closet from local storage
  useEffect(() => {
    const saved = localStorage.getItem('fashion_mate_closet');
    if (saved) setCloset(JSON.parse(saved));
  }, []);

  const saveToCloset = (suggestion: OutfitSuggestion) => {
    const newCloset = [suggestion, ...closet.filter(item => item.id !== suggestion.id)];
    setCloset(newCloset);
    localStorage.setItem('fashion_mate_closet', JSON.stringify(newCloset));
  };

  const removeFromCloset = (id: string) => {
    const newCloset = closet.filter(item => item.id !== id);
    setCloset(newCloset);
    localStorage.setItem('fashion_mate_closet', JSON.stringify(newCloset));
  };

  const [currentFilterShape, setCurrentFilterShape] = useState<BodyShape | 'Total'>(profile.bodyShape);

  const handleRecommend = async (filterShape?: BodyShape) => {
    setIsGenerating(true);
    setActiveTab('recommend');
    const shapeToUse = filterShape || profile.bodyShape;
    setCurrentFilterShape(shapeToUse);
    const results = await generateOutfitRecommendation({ ...profile, bodyShape: shapeToUse });
    setSuggestions(results);
    setIsGenerating(false);
  };

  const handleTPOSelect = async (tpo: TPO) => {
    setActiveTPO(tpo);
    if (!tpoContent[tpo]) {
      const tip = await generateTPOTip(tpo, profile);
      setTpoContent(prev => ({ ...prev, [tpo]: tip }));
    }
  };

  const handleDiagnosisAnswer = (questionId: string, value: string) => {
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);
    
    if (diagnosisStep < DIAGNOSIS_QUESTIONS.length - 1) {
      setDiagnosisStep(prev => prev + 1);
    } else {
      // Logic to determine body shape
      let shape: BodyShape = 'Rectangle';
      
      const { widths, waist, weight, silhouette } = newAnswers;
      
      if (waist === 'very' && widths === 'similar') shape = 'Hourglass';
      else if (widths === 'hip' || weight === 'bottom' || silhouette === 'bottom-heavy') {
         shape = Math.random() > 0.5 ? 'Triangle' : 'BottomHeavy';
      }
      else if (widths === 'shoulder' || weight === 'top' || silhouette === 'top-heavy') shape = 'InvertedTriangle';
      else if (weight === 'top' && waist === 'none') shape = 'Apple';
      else shape = 'Rectangle';

      setProfile(prev => ({ ...prev, bodyShape: shape }));
      setStep('result');
    }
  };

  const getProgress = () => {
    if (step === 'diagnosis') return ((diagnosisStep + 1) / DIAGNOSIS_QUESTIONS.length) * 40 + 10;
    if (step === 'result') return 60;
    if (step === 'profile') return 80;
    if (step === 'main') return 100;
    return 0;
  };

  return (
    <div className="max-w-5xl mx-auto min-h-screen flex flex-col pt-4 pb-24 px-6 overflow-x-hidden">
      {/* Header */}
      <header className="flex flex-col px-4 py-4 mb-4 gap-4">
        <div className="flex items-center justify-between w-full">
          <div className="w-8" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-700 flex items-center justify-center gap-2">
            패션 메이트 <span className="text-pink-400">💕</span>
          </h1>
          <div 
            onClick={() => { setStep('start'); setDiagnosisStep(0); setAnswers({}); }}
            className="w-8 h-8 rounded-full bg-white border border-pink-200 flex items-center justify-center text-xs shadow-sm cursor-pointer hover:scale-110 transition-transform"
          >
            🔄
          </div>
        </div>
        
        {step !== 'start' && (
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${getProgress()}%` }}
              className="h-full bg-gradient-to-r from-mint-300 to-pink-300"
            />
          </div>
        )}
      </header>

      <AnimatePresence mode="wait">
        {step === 'start' && (
          <motion.div 
            key="start"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 flex flex-col items-center justify-center text-center space-y-8 py-20"
          >
            <div className="w-40 h-40 rounded-full bg-white/40 flex items-center justify-center text-7xl shadow-xl glass-panel animate-bounce">🧚‍♀️</div>
            <div className="space-y-4">
              <h2 className="text-4xl font-bold text-slate-800 font-display">당신만의 패션 요정, 율이입니다!</h2>
              <p className="text-slate-500 text-lg">나에게 꼭 맞는 스타일을 찾기 위해<br/>율이와 함께 즐거운 대화를 시작해볼까요? ✨</p>
            </div>
            <button 
              onClick={() => setStep('diagnosis')}
              className="pill-button px-12 py-5 bg-mint-100 text-slate-700 text-xl font-bold shadow-lg shadow-mint-100/30"
            >
              시작하기 💕
            </button>
          </motion.div>
        )}

        {step === 'diagnosis' && (
          <motion.div 
            key="diagnosis"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 max-w-lg mx-auto w-full py-12"
          >
            <div className="card space-y-8">
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">질문 {diagnosisStep + 1} / {DIAGNOSIS_QUESTIONS.length}</p>
                <h3 className="text-2xl font-bold text-slate-700">{DIAGNOSIS_QUESTIONS[diagnosisStep].question}</h3>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {DIAGNOSIS_QUESTIONS[diagnosisStep].options.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleDiagnosisAnswer(DIAGNOSIS_QUESTIONS[diagnosisStep].id, opt.value)}
                    className="p-5 glass-panel text-left hover:bg-mint-50/50 hover:border-mint-200 transition-all font-bold text-slate-600 flex justify-between items-center group"
                  >
                    {opt.label}
                    <ChevronRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {step === 'result' && (
          <motion.div 
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 max-w-lg mx-auto w-full py-12"
          >
            <div className={`card text-center space-y-8 p-10 border-4 border-white shadow-2xl ${BODY_SHAPE_INFO[profile.bodyShape].color}`}>
              <div className="w-24 h-24 rounded-full bg-white mx-auto flex items-center justify-center text-5xl shadow-inner">
                {BODY_SHAPE_INFO[profile.bodyShape].icon}
              </div>
              <div className="space-y-3">
                <h3 className="text-3xl font-bold text-slate-800">당신은 <span className="text-pink-500 underline decoration-pink-200 underline-offset-8">"{BODY_SHAPE_INFO[profile.bodyShape].title}형"</span> 입니다 💕</h3>
                <p className="text-slate-600 leading-relaxed font-bold">{BODY_SHAPE_INFO[profile.bodyShape].desc}</p>
              </div>
              <div className="p-6 bg-white/40 rounded-3xl border border-white/60 text-left">
                <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-tight">YURI'S FEEDBACK</p>
                <p className="text-sm text-slate-700 italic">"어머! 이 체형에 어울리는 마법같은 코디들이 벌써부터 떠오르네요! 당신의 매력을 200% 살릴 수 있는 스타일로 준비해볼게요! 💞"</p>
              </div>
              <button 
                onClick={() => setStep('profile')}
                className="w-full pill-button py-5 bg-white text-slate-700 font-bold shadow-md hover:shadow-xl"
              >
                상세 프로필 설정하기 🪄
              </button>
            </div>
          </motion.div>
        )}

        {step === 'profile' && (
          <motion.div 
            key="profile-setup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 max-w-lg mx-auto w-full py-12"
          >
            <div className="card space-y-8">
              <h3 className="text-2xl font-bold text-slate-700 flex items-center gap-2">
                <User className="w-6 h-6 text-mint-500" /> 마지막 디테일 채우기
              </h3>
              
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">키 (cm)</label>
                  <input 
                    type="number" 
                    value={profile.height}
                    onChange={(e) => setProfile({...profile, height: e.target.value})}
                    className="w-full bg-white/50 border border-white/60 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-mint-100 transition-all font-bold text-slate-700 shadow-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">스타일 선호</label>
                  <div className="flex flex-wrap gap-2">
                    {(['Casual', 'Girlish', 'Feminine', 'Street', 'Minimal'] as StylePreference[]).map(style => (
                      <button
                        key={style}
                        onClick={() => setProfile({...profile, style: style})}
                        className={`text-sm font-bold px-6 py-3 rounded-full border transition-all ${
                          profile.style === style 
                            ? 'bg-pink-100 border-pink-200 text-pink-600 shadow-sm' 
                            : 'bg-white/40 border-white/60 text-slate-400'
                        }`}
                      >
                        {style === 'Casual' ? '캐주얼' : style === 'Girlish' ? '걸리시' : style === 'Feminine' ? '페미닌' : style === 'Street' ? '스트릿' : '미니멀'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">오늘의 기분</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['Excitement', 'Calm', 'Active', 'Confidence'] as Mood[]).map(m => (
                      <button
                        key={m}
                        onClick={() => setProfile({...profile, mood: m})}
                        className={`text-sm font-bold py-4 rounded-2xl border transition-all ${
                          profile.mood === m 
                            ? 'bg-mint-100 border-mint-200 text-slate-700 shadow-sm' 
                            : 'bg-white/40 border-white/60 text-slate-400'
                        }`}
                      >
                        {m === 'Excitement' ? '설렘 💕' : m === 'Calm' ? '차분함 ☕' : m === 'Active' ? '활동적 🏃' : '자신감 🔥'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => { setStep('main'); handleRecommend(); }}
                className="w-full pill-button py-5 bg-mint-100 text-slate-700 font-bold shadow-lg"
              >
                맞춤 코디 보러가기 ✨
              </button>
            </div>
          </motion.div>
        )}

        {step === 'main' && (
          <motion.div 
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1"
          >
            {/* Header / Navigation */}
            <nav className="flex justify-center mb-8">
              <div className="glass-panel p-1.5 flex gap-1 items-center">
                <NavTab active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} label="내 프로필" />
                <NavTab active={activeTab === 'recommend'} onClick={() => setActiveTab('recommend')} label="AI 추천" />
                <NavTab active={activeTab === 'tpo'} onClick={() => { setActiveTab('tpo'); handleTPOSelect(activeTPO); }} label="TPO 팁" />
                <NavTab active={activeTab === 'closet'} onClick={() => setActiveTab('closet')} label="옷장" />
              </div>
            </nav>

            <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar Info (AI Yuri Persona) */}
        <section className="lg:col-span-4 glass-panel p-8 flex flex-col items-center text-center sticky top-4">
          <div className="mb-6 relative">
            <div className="w-32 h-32 rounded-full bg-mint-100 flex items-center justify-center text-5xl shadow-inner border border-white/40">
              🧚‍♀️
            </div>
            <div className="absolute -bottom-2 -right-2 bg-white px-3 py-1 rounded-full text-[10px] font-bold shadow-md border border-pink-50 text-pink-500 uppercase tracking-tight">
              Lv. 스타일 요정
            </div>
          </div>
          
          <h2 className="text-3xl font-bold font-display text-slate-800 mb-1">율이 Yuri</h2>
          <div className="bg-pink-50 text-pink-500 text-[10px] px-2 py-0.5 rounded-full font-bold mb-4">STYLE FAIRY</div>
          <p className="text-sm text-slate-500 leading-relaxed max-w-[200px] mb-8">
            {profile.mood === 'Excitement' ? `${BODY_SHAPE_INFO[profile.bodyShape].title}형인 당신의 설레는 하루를 위해 부드러운 룩을 준비했어요!` : 
             profile.mood === 'Calm' ? `차분한 느낌이 어울리는 ${BODY_SHAPE_INFO[profile.bodyShape].title}형 코디, 제가 찾아볼게요.` : 
             profile.mood === 'Active' ? `${BODY_SHAPE_INFO[profile.bodyShape].title}형의 활동성을 살려줄 에너제틱한 스타일은 어떠세요?` :
             `${BODY_SHAPE_INFO[profile.bodyShape].title}형만의 자신감을 채워줄 멋진 스타일을 율이가 찾아줄게요!`}
          </p>

          <div className="w-full space-y-3">
            <div className="bg-white/40 p-4 rounded-2xl text-left border border-white/60">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1.5 font-bold">신체 프로필</p>
              <p className="text-sm font-bold text-slate-700">{profile.height}cm · {BODY_SHAPE_INFO[profile.bodyShape].title}형</p>
            </div>
            <div className="bg-white/40 p-4 rounded-2xl text-left border border-white/60">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1.5 font-bold">오늘의 기분</p>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-pink-400 shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
                <p className="text-sm font-bold text-slate-700">
                  {profile.mood === 'Excitement' && '설렘'}
                  {profile.mood === 'Calm' && '차분함'}
                  {profile.mood === 'Active' && '활동적'}
                  {profile.mood === 'Confidence' && '자신감'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="lg:col-span-8 h-full min-h-[600px] relative">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="card">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <User className="w-5 h-5 text-mint-500" /> 상세 프로필 설정
                  </h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 ml-1">신체 길이 (cm)</label>
                      <input 
                        type="number" 
                        value={profile.height}
                        onChange={(e) => setProfile({...profile, height: e.target.value})}
                        className="w-full bg-white/50 border border-white/60 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-mint-100 transition-all font-bold text-slate-700 shadow-sm"
                        placeholder="160"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 ml-1">나의 체형</label>
                      <div className="grid grid-cols-3 gap-3">
                        {(['Triangle', 'Rectangle', 'InvertedTriangle'] as BodyShape[]).map(shape => (
                          <button
                            key={shape}
                            onClick={() => setProfile({...profile, bodyShape: shape})}
                            className={`text-xs font-bold py-4 rounded-2xl border transition-all ${
                              profile.bodyShape === shape 
                                ? 'bg-mint-100 border-mint-200 text-slate-700 shadow-sm' 
                                : 'bg-white/40 border-white/60 text-slate-400'
                            }`}
                          >
                            {shape === 'Triangle' ? '삼각형' : shape === 'Rectangle' ? '직사각형' : '역삼각형'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 ml-1">스타일 선호</label>
                      <div className="flex flex-wrap gap-2">
                        {(['Casual', 'Girlish', 'Feminine', 'Street', 'Minimal'] as StylePreference[]).map(style => (
                          <button
                            key={style}
                            onClick={() => setProfile({...profile, style: style})}
                            className={`text-xs font-bold px-5 py-2.5 rounded-full border transition-all ${
                              profile.style === style 
                                ? 'bg-pink-100 border-pink-200 text-pink-600 shadow-sm' 
                                : 'bg-white/40 border-white/60 text-slate-400'
                            }`}
                          >
                            {style === 'Casual' ? '캐주얼' : 
                             style === 'Girlish' ? '걸리시' : 
                             style === 'Feminine' ? '페미닌' : 
                             style === 'Street' ? '스트릿' : '미니멀'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-mint-50/50 rounded-2xl border border-mint-100/30">
                      <div>
                        <p className="text-sm font-bold text-mint-600">패션 초보 모드</p>
                        <p className="text-[10px] text-mint-400 font-medium">용어 설명을 직관적으로 변경해드려요 ✨</p>
                      </div>
                      <button 
                        onClick={() => setProfile({...profile, isBeginner: !profile.isBeginner})}
                        className={`w-14 h-7 rounded-full transition-all relative ${profile.isBeginner ? 'bg-mint-400 shadow-inner' : 'bg-slate-200 shadow-inner'}`}
                      >
                        <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${profile.isBeginner ? 'translate-x-7' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleRecommend}
                  className="w-full pill-button bg-mint-100 text-slate-700 text-lg font-bold flex items-center justify-center gap-3 py-5 shadow-lg shadow-mint-100/20"
                >
                  <Sparkles className="w-5 h-5" /> 율이에게 스타일 물어보기
                </button>
              </motion.div>
            )}

            {activeTab === 'recommend' && (
              <motion.div
                key="recommend"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Body Shape Filter */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">체형별 전체 보기</p>
                    {currentFilterShape !== profile.bodyShape && (
                      <button 
                        onClick={() => handleRecommend(profile.bodyShape)}
                        className="text-[10px] text-mint-500 font-bold underline underline-offset-4"
                      >
                        내 체형으로 돌아가기
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {(Object.keys(BODY_SHAPE_INFO) as BodyShape[]).map(shape => (
                      <button
                        key={shape}
                        onClick={() => handleRecommend(shape)}
                        className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                          currentFilterShape === shape 
                            ? 'bg-mint-100 border-mint-200 text-slate-700 shadow-sm' 
                            : 'bg-white/40 border-white/60 text-slate-400'
                        }`}
                      >
                        {BODY_SHAPE_INFO[shape].icon} {BODY_SHAPE_INFO[shape].title}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-end mb-2">
                  <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                    {BODY_SHAPE_INFO[currentFilterShape as BodyShape]?.title || '전체'}형을 위한 <span className="bg-pink-100 px-2 py-0.5 rounded text-pink-500">Best</span> 제안
                  </h3>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{suggestions.length}개의 추천 결과</div>
                </div>

                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center py-32 space-y-6 glass-panel">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-mint-100 border-t-pink-400 rounded-full animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center text-xs">🧚‍♀️</div>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-700 font-bold">율이가 옷장을 뒤지는 중이에요...</p>
                      <p className="text-[11px] text-slate-400 mt-1 animate-pulse">잠시만 기다려주세요!</p>
                    </div>
                  </div>
                ) : suggestions.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
                    {suggestions.map((s, idx) => (
                      <motion.div 
                        key={s.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.15 }}
                        className="glass-panel overflow-hidden flex flex-col group"
                      >
                        <div className="h-44 bg-slate-100/50 flex items-center justify-center text-5xl relative group-hover:scale-105 transition-transform duration-500">
                          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-white/40 to-transparent" />
                          {idx % 3 === 0 ? '👗' : idx % 3 === 1 ? '🧶' : '👢'}
                        </div>
                        
                        <div className="p-6 flex-1 flex flex-col">
                          <h4 className="text-lg font-bold text-slate-800 mb-2 truncate">{s.title}</h4>
                          <p className="text-[11px] text-slate-500 line-clamp-3 mb-4 leading-relaxed">{s.description}</p>
                          
                          <div className="flex gap-1.5 h-6 mb-4">
                            {s.colors.map((color, cIdx) => (
                              <div 
                                key={cIdx} 
                                className="w-6 h-6 rounded-lg border border-white/60 shadow-sm"
                                style={{ backgroundColor: color.startsWith('#') ? color : '#eee' }}
                              />
                            ))}
                          </div>

                          <div className="mt-auto space-y-4">
                            <div className="bg-pink-50/50 p-4 rounded-2xl border-l-4 border-pink-100">
                              <p className="text-[11px] text-pink-600 italic font-medium">"{s.yuriComment}"</p>
                            </div>
                            <button 
                              onClick={() => saveToCloset(s)}
                              className="w-full bg-mint-100 py-3 text-xs font-bold rounded-xl text-slate-700 pill-btn"
                            >
                              옷장에 담기
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="glass-panel p-20 text-center flex flex-col items-center gap-4">
                    <p className="text-slate-400 font-bold">아직 추천 결과가 없습니다.</p>
                    <button onClick={() => setActiveTab('profile')} className="text-xs text-mint-500 underline underline-offset-4 font-bold">프로필 설정하러 가기</button>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'tpo' && (
              <motion.div
                key="tpo"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="card min-h-[500px] flex flex-col">
                  <h3 className="text-lg font-bold mb-8 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-pink-400" /> 상황별 최적의 마법 팁
                  </h3>
                  
                  <div className="grid grid-cols-4 gap-4 mb-10">
                    {(['Date', 'Interview', 'Travel', 'Meeting'] as TPO[]).map(tpo => (
                      <button
                        key={tpo}
                        onClick={() => handleTPOSelect(tpo)}
                        className={`aspect-square rounded-3xl border flex flex-col items-center justify-center gap-2 transition-all group ${
                          activeTPO === tpo 
                            ? 'bg-pink-100 border-pink-200 text-pink-600 shadow-sm scale-105' 
                            : 'bg-white/30 border-white/60 text-slate-400 hover:bg-white/50'
                        }`}
                      >
                        <span className="text-3xl group-hover:scale-110 transition-transform">
                          {tpo === 'Date' && '💌'}
                          {tpo === 'Interview' && '💼'}
                          {tpo === 'Travel' && '✈️'}
                          {tpo === 'Meeting' && '👩‍❤️‍👩'}
                        </span>
                        <span className="text-[10px] font-bold">
                          {tpo === 'Date' && '데이트'}
                          {tpo === 'Interview' && '면접'}
                          {tpo === 'Travel' && '여행'}
                          {tpo === 'Meeting' && '친구 모임'}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="bg-white/50 p-8 rounded-[32px] border border-white/60 flex-1 flex flex-col">
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-4">율이의 특별한 스타일 조언</span>
                    {tpoContent[activeTPO] ? (
                      <p className="text-sm text-slate-700 leading-8 animate-in fade-in transition-all duration-500">{tpoContent[activeTPO]}</p>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center gap-4">
                        <div className="w-12 h-12 bg-pink-50 rounded-full flex items-center justify-center animate-bounce">🧚‍♀️</div>
                        <p className="text-xs text-slate-300 font-bold uppercase tracking-widest">율이가 팁을 마법으로 소환 중...</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'closet' && (
              <motion.div
                key="closet"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Bookmark className="w-5 h-5 text-pink-400 fill-pink-400" /> 저장된 콜렉션
                  </h3>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{closet.length}개의 아이템</div>
                </div>

                {closet.length === 0 ? (
                  <div className="glass-panel py-32 text-center flex flex-col items-center justify-center gap-6">
                    <div className="w-24 h-24 bg-slate-50/50 rounded-full flex items-center justify-center text-5xl grayscale opacity-30">👗</div>
                    <div className="space-y-1">
                      <p className="text-slate-500 font-bold">옷장이 비어있어요.</p>
                      <p className="text-[10px] text-slate-400">당신의 취향을 담은 스타일을 마음에 드는 코디를 담아보세요!</p>
                    </div>
                    <button 
                      onClick={() => setActiveTab('recommend')}
                      className="text-xs font-bold bg-mint-100 text-slate-700 px-6 py-2.5 rounded-full hover:shadow-md transition-all shadow-sm"
                    >
                      코디 추천 받으러 가기
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-20">
                    {closet.map(item => (
                      <motion.div 
                        layout
                        key={item.id}
                        className="glass-panel p-6 group hover:shadow-lg transition-all"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="font-bold text-slate-800 tracking-tight">{item.title}</h4>
                          <button 
                            onClick={() => removeFromCloset(item.id)}
                            className="p-2 -mr-2 text-slate-300 hover:text-pink-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2 mb-6 leading-relaxed">{item.description}</p>
                        <div className="flex items-center justify-between border-t border-slate-50 pt-4">
                          <div className="flex -space-x-1.5">
                            {item.colors.slice(0, 3).map((c, i) => (
                              <div key={i} className="w-5 h-5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: c }} />
                            ))}
                          </div>
                          <span className="text-[9px] font-bold text-slate-200 uppercase">{new Date(item.timestamp).toLocaleDateString()}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* Floating Action Menu (Mobile Placeholder) */}
      <div className="fixed bottom-0 left-0 right-0 glass-panel border-t-0 border-x-0 rounded-none bg-white/70 lg:hidden px-8 py-4 flex justify-between items-center z-50">
        <NavButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<User className="w-5 h-5" />} label="프로필" />
        <NavButton active={activeTab === 'recommend'} onClick={() => setActiveTab('recommend')} icon={<Sparkles className="w-5 h-5" />} label="AI 추천" />
        <NavButton active={activeTab === 'tpo'} onClick={() => { setActiveTab('tpo'); handleTPOSelect(activeTPO); }} icon={<MapPin className="w-5 h-5" />} label="TPO 팁" />
        <NavButton active={activeTab === 'closet'} onClick={() => setActiveTab('closet')} icon={<Bookmark className="w-5 h-5" />} label="옷장" />
      </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavTab({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`px-8 py-2.5 pill-button text-sm font-bold transition-all ${
        active ? 'tab-active' : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      {label}
    </button>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-mint-500 scale-110' : 'text-slate-300 hover:text-slate-400'}`}
    >
      {icon}
      <span className={`text-[10px] font-bold ${active ? 'opacity-100' : 'opacity-0'}`}>{label}</span>
      {active && <motion.div layoutId="nav-dot" className="w-1 h-1 bg-mint-500 rounded-full mt-0.5" />}
    </button>
  );
}


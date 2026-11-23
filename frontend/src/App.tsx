import React, { useRef, useState } from 'react';
import { Navbar } from './components/Navbar';
import { TextAnalyzer } from './components/TextAnalyzer';
import { PersonalityTypesSection } from './components/PersonalityTypesSection';
import { PredictionResult } from './components/PredictionResult';
import { PersonalityDetailModal } from './components/PersonalityDetailModal';
import { AboutModelView } from './components/AboutModelView';
import { ModelNotConnectedState } from './components/ModelNotConnectedState';
import { DataInsightsView } from './components/insights/DataInsightsView';
import { PersonalityIllustration } from './components/PersonalityIllustration';
import { analyzePersonalityTexts, PredictionError } from './services/predictor';
import {
  AnalyzeInputMode,
  AppRoute,
  PersonalityTypeInfo,
  PredictionResult as PredictionResultData,
} from './types/personality';

const HERO_IMAGE_PATH = '/src/assets/images/hero_personalens_characters_1795447757857.jpg';

export default function App() {
  const [activeRoute, setActiveRoute] = useState<AppRoute>('home');
  const [inputMode, setInputMode] = useState<AnalyzeInputMode>('single');
  const [singleText, setSingleText] = useState('');
  const [multiplePosts, setMultiplePosts] = useState<string[]>(['', '']);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [modelNotConnectedMessage, setModelNotConnectedMessage] = useState<string | null>(null);
  const [predictionResult, setPredictionResult] = useState<PredictionResultData | null>(null);
  const [submittedPosts, setSubmittedPosts] = useState<string[]>([]);
  const [selectedPersonality, setSelectedPersonality] = useState<PersonalityTypeInfo | null>(null);
  const [heroImageError, setHeroImageError] = useState(false);

  const analyzerRef = useRef<HTMLDivElement | null>(null);

  const navigateTo = (route: AppRoute) => {
    setActiveRoute(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAnalyzeSubmit = async () => {
    setAnalysisError(null);
    setModelNotConnectedMessage(null);
    setIsAnalyzing(true);

    const activeTexts =
      inputMode === 'single'
        ? [singleText.trim()].filter(Boolean)
        : multiplePosts.map((p) => p.trim()).filter(Boolean);

    try {
      const result = await analyzePersonalityTexts(activeTexts, inputMode);
      setSubmittedPosts(activeTexts);
      setPredictionResult(result);
      setActiveRoute('analyze');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (err instanceof PredictionError && err.isModelNotConnected) {
        setPredictionResult(null);
        setModelNotConnectedMessage(err.message);
        setActiveRoute('analyze');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (err instanceof PredictionError) {
        setAnalysisError(err.message);
      } else {
        setAnalysisError('Something went wrong while contacting the prediction backend.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleResetToInput = () => {
    setPredictionResult(null);
    setModelNotConnectedMessage(null);
    setAnalysisError(null);
    setActiveRoute('analyze');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToHomeAnalyzer = () => {
    if (activeRoute !== 'home') {
      setActiveRoute('home');
      setTimeout(() => {
        analyzerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 60);
    } else {
      analyzerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#1E2430]">
      <Navbar activeRoute={activeRoute} onNavigate={navigateTo} />

      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {/* HOME VIEW */}
        {activeRoute === 'home' && (
          <div className="space-y-20">
            {/* Hero Section */}
            <section className="space-y-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
                <div className="lg:col-span-6 space-y-5">
                  <div className="flex items-center gap-2 text-xs font-medium text-[#5A6375]">
                    <span>Experimental Text-Based MBTI Discovery</span>
                    <span aria-hidden="true">·</span>
                    <span>16 Archetypes</span>
                  </div>

                  <h1 className="font-display text-[clamp(2.25rem,4vw,3.5rem)] leading-[1.1] font-bold tracking-tight text-[#1E2430] [text-wrap:balance]">
                    Discover the Personality Behind Your Words
                  </h1>

                  <p className="text-base sm:text-lg text-[#525B6E] leading-relaxed max-w-xl">
                    Explore your personality through machine learning text analysis. Share a single reflection or multiple separate posts to preview how PersonaLens maps writing to the 16 MBTI archetypes.
                  </p>

                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    <button
                      type="button"
                      onClick={scrollToHomeAnalyzer}
                      className="px-6 py-3 rounded-xl bg-[#33A474] hover:bg-[#298B61] text-white text-sm sm:text-base font-semibold shadow-sm transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Start Writing Analysis
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateTo('types')}
                      className="px-5 py-3 rounded-xl bg-white hover:bg-[#F3F2EE] border border-black/[0.08] text-sm sm:text-base font-medium text-[#1E2430] transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Browse All 16 Types
                    </button>
                  </div>
                </div>

                {/* Large Welcoming Personality Illustration */}
                <div className="lg:col-span-6">
                  <div className="rounded-3xl overflow-hidden border border-black/[0.07] bg-white shadow-[0_14px_40px_-14px_rgba(30,36,48,0.08)]">
                    {!heroImageError ? (
                      <img
                        src={HERO_IMAGE_PATH}
                        alt="Four illustrated geometric personality characters representing Analysts, Diplomats, Sentinels, and Explorers"
                        referrerPolicy="no-referrer"
                        onError={() => setHeroImageError(true)}
                        className="w-full aspect-[16/9] object-cover block"
                      />
                    ) : (
                      <div className="w-full aspect-[16/9] bg-[#FAF9F6] px-6 py-8 grid grid-cols-4 gap-3 items-center">
                        <PersonalityIllustration code="INTJ" className="w-full h-auto" />
                        <PersonalityIllustration code="ENFP" className="w-full h-auto" />
                        <PersonalityIllustration code="ISFJ" className="w-full h-auto" />
                        <PersonalityIllustration code="ISFP" className="w-full h-auto" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Prominent Text Input Section */}
              <div ref={analyzerRef} className="max-w-4xl mx-auto">
                <TextAnalyzer
                  mode={inputMode}
                  onModeChange={(nextMode) => {
                    setInputMode(nextMode);
                    if (analysisError) setAnalysisError(null);
                  }}
                  singleText={singleText}
                  onSingleTextChange={(val) => {
                    setSingleText(val);
                    if (analysisError) setAnalysisError(null);
                  }}
                  multiplePosts={multiplePosts}
                  onMultiplePostsChange={(posts) => {
                    setMultiplePosts(posts);
                    if (analysisError) setAnalysisError(null);
                  }}
                  onSubmit={handleAnalyzeSubmit}
                  isLoading={isAnalyzing}
                  error={analysisError}
                />
              </div>
            </section>

            {/* 16 Personality Types Showcase Below Main Section */}
            <PersonalityTypesSection
              onSelectType={setSelectedPersonality}
              showFilterBar={true}
              heading="Meet All 16 Personality Archetypes"
              subheading="Every personality brings a distinct rhythm of thought, empathy, structure, and curiosity. Select any character below to explore their profile."
            />
          </div>
        )}

        {/* PERSONALITY TYPES DIRECTORY VIEW */}
        {activeRoute === 'types' && (
          <PersonalityTypesSection
            onSelectType={setSelectedPersonality}
            showFilterBar={true}
          />
        )}

        {/* ANALYZE TEXT & PREDICTION RESULT VIEW */}
        {activeRoute === 'analyze' && (
          <div className="space-y-10">
            {predictionResult ? (
              <PredictionResult
                result={predictionResult}
                submittedPosts={submittedPosts}
                onAnalyzeAgain={handleResetToInput}
                onExploreTypes={() => navigateTo('types')}
              />
            ) : modelNotConnectedMessage ? (
              <div className="max-w-4xl mx-auto">
                <ModelNotConnectedState
                  message={modelNotConnectedMessage}
                  onEditInput={handleResetToInput}
                  onExploreTypes={() => navigateTo('types')}
                />
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-8">
                <div className="space-y-3 text-center">
                  <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#1E2430] [text-wrap:balance]">
                    Analyze Your Writing Voice
                  </h1>
                  <p className="text-base text-[#525B6E] max-w-2xl mx-auto leading-relaxed">
                    Choose between a single writing sample or multiple separate posts. Both modes send a structured list of texts to the PersonaLens FastAPI inference endpoint.
                  </p>
                </div>

                <TextAnalyzer
                  mode={inputMode}
                  onModeChange={(nextMode) => {
                    setInputMode(nextMode);
                    if (analysisError) setAnalysisError(null);
                  }}
                  singleText={singleText}
                  onSingleTextChange={(val) => {
                    setSingleText(val);
                    if (analysisError) setAnalysisError(null);
                  }}
                  multiplePosts={multiplePosts}
                  onMultiplePostsChange={(posts) => {
                    setMultiplePosts(posts);
                    if (analysisError) setAnalysisError(null);
                  }}
                  onSubmit={handleAnalyzeSubmit}
                  isLoading={isAnalyzing}
                  error={analysisError}
                />
              </div>
            )}
          </div>
        )}

        {/* DATA INSIGHTS BI DASHBOARD VIEW */}
        {activeRoute === 'insights' && <DataInsightsView />}

        {/* ABOUT THE MODEL VIEW */}
        {activeRoute === 'about' && (
          <AboutModelView onGoToAnalyze={() => navigateTo('analyze')} />
        )}
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="border-t border-black/[0.06] bg-white">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6B7280]">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-sm text-[#1E2430]">PersonaLens</span>
            <span aria-hidden="true">·</span>
            <span>Experimental prediction of self-reported MBTI labels from writing</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => navigateTo('home')}
              className="hover:text-[#1E2430] transition-colors cursor-pointer"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => navigateTo('types')}
              className="hover:text-[#1E2430] transition-colors cursor-pointer"
            >
              Personality Types
            </button>
            <button
              type="button"
              onClick={() => navigateTo('analyze')}
              className="hover:text-[#1E2430] transition-colors cursor-pointer"
            >
              Analyze Text
            </button>
            <button
              type="button"
              onClick={() => navigateTo('insights')}
              className="hover:text-[#1E2430] transition-colors cursor-pointer"
            >
              Data Insights
            </button>
            <button
              type="button"
              onClick={() => navigateTo('about')}
              className="hover:text-[#1E2430] transition-colors cursor-pointer"
            >
              About the Model
            </button>
          </div>
        </div>
      </footer>

      {/* Archetype Detail Modal */}
      <PersonalityDetailModal
        personality={selectedPersonality}
        onClose={() => setSelectedPersonality(null)}
        onGoToAnalyze={() => {
          setPredictionResult(null);
          setModelNotConnectedMessage(null);
          navigateTo('analyze');
        }}
      />
    </div>
  );
}

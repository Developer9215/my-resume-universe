import React, { useState, useEffect, useRef } from 'react';
import { analyzeJD, analyzeURLJD, analyzeImageJD } from '../../services/ai';
import { supabase } from '../../services/supabase'; // <-- 이 경로가 수정되었습니다.
import './JDAnalysisForm.css';

const JDAnalysisForm = () => {
  const [inputMode, setInputMode] = useState('text');
  const [inputValue, setInputValue] = useState('');
  const [urlValue, setUrlValue] = useState('');
  const [images, setImages] = useState([]);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [autoSaveStatus, setAutoSaveStatus] = useState('');

  const fileInputRef = useRef(null);

  // 자동 저장 로직
  useEffect(() => {
    const savedText = localStorage.getItem('jdAnalysisText');
    if (savedText) {
      setInputValue(savedText);
      setWordCount(savedText.split(/\s+/).filter(Boolean).length);
    }
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (inputValue) {
        localStorage.setItem('jdAnalysisText', inputValue);
        setAutoSaveStatus('자동 저장 완료');
      } else {
        localStorage.removeItem('jdAnalysisText');
        setAutoSaveStatus('');
      }
    }, 1000);

    return () => clearTimeout(handler);
  }, [inputValue]);

  // 입력 핸들러
  const handleInputChange = (e) => {
    const text = e.target.value;
    setInputValue(text);
    setWordCount(text.split(/\s+/).filter(Boolean).length);
    setAutoSaveStatus('...자동 저장 중');
  };

  const handleUrlChange = (e) => {
    setUrlValue(e.target.value);
  };

  // 이미지 업로드 핸들러
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setImages(prevImages => [...prevImages, ...files]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    setImages(prevImages => [...prevImages, ...files]);
  };

  const handleImageRemove = (index) => {
    setImages(prevImages => prevImages.filter((_, i) => i !== index));
  };

  const handleModeChange = (mode) => {
    setInputMode(mode);
    setAnalysisResult(null); // 모드 변경 시 결과 초기화
  };

  // 분석 실행 함수
  const handleAnalysis = async () => {
    setAnalysisResult(null);
    setIsLoading(true);
    setIsAnalyzing(true);

    try {
      let result;
      switch (inputMode) {
        case 'text':
          result = await analyzeJD(inputValue);
          break;
        case 'url':
          result = await analyzeURLJD(urlValue);
          break;
        case 'image':
          result = await analyzeImageJD(images);
          break;
        default:
          throw new Error('Invalid input mode');
      }

      setAnalysisResult(result);
    } catch (error) {
      console.error('Analysis failed:', error);
      setAnalysisResult({ error: '분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
    } finally {
      setIsLoading(false);
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="jd-analysis-section">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">JD (Job Description) 분석</h2>
          <p className="card-subtitle">
            텍스트, URL, 또는 이미지 파일로 채용 공고를 분석하여 핵심 키워드, 자격 요건, 우대 사항을 추출합니다.
          </p>
        </div>

        {/* 입력 모드 탭 */}
        <div className="input-mode-tabs">
          <button
            className={`tab-btn ${inputMode === 'text' ? 'active' : ''}`}
            onClick={() => handleModeChange('text')}
          >
            텍스트 입력
          </button>
          <button
            className={`tab-btn ${inputMode === 'url' ? 'active' : ''}`}
            onClick={() => handleModeChange('url')}
          >
            URL 분석
          </button>
          <button
            className={`tab-btn ${inputMode === 'image' ? 'active' : ''}`}
            onClick={() => handleModeChange('image')}
          >
            이미지 분석
          </button>
        </div>

        {/* 입력 필드 (조건부 렌더링) */}
        <div className="card-body">
          {inputMode === 'text' && (
            <>
              <div className="textarea-header">
                <span className="text-sm font-semibold">채용 공고</span>
                <div className="textarea-info">
                  <span className="word-count">{wordCount} 단어</span>
                  <span className="auto-save-status">{autoSaveStatus}</span>
                </div>
              </div>
              <textarea
                className="jd-textarea"
                placeholder="채용 공고 내용을 여기에 붙여넣으세요."
                value={inputValue}
                onChange={handleInputChange}
                disabled={isAnalyzing}
              />
            </>
          )}

          {inputMode === 'url' && (
            <>
              <div className="mb-4">
                <span className="text-sm font-semibold">채용 공고 URL</span>
              </div>
              <input
                type="url"
                className="form-input"
                placeholder="https://www.example.com/job-post"
                value={urlValue}
                onChange={handleUrlChange}
                disabled={isAnalyzing}
              />
            </>
          )}

          {inputMode === 'image' && (
            <>
              <div
                className="image-upload-area"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden-file-input"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isAnalyzing}
                />
                <span className="text-gray-500">
                  <span className="font-bold text-primary-500">클릭</span>하거나
                  여기에 파일을 끌어다 놓으세요.
                </span>
                <span className="text-xs text-gray-400">JPG, PNG, GIF 등 이미지 파일</span>
              </div>
              {images.length > 0 && (
                <div className="image-preview-list">
                  {images.map((image, index) => (
                    <div key={index} className="image-preview-item">
                      <img src={URL.createObjectURL(image)} alt={`preview-${index}`} className="image-preview" />
                      <button className="image-preview-close" onClick={(e) => { e.stopPropagation(); handleImageRemove(index); }}>
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* 분석 버튼 */}
          <div className="jd-form-actions">
            <button
              className={`analyze-button ${isLoading ? 'btn-disabled' : 'btn-primary'}`}
              onClick={handleAnalysis}
              disabled={isLoading || (inputMode === 'text' && !inputValue) || (inputMode === 'url' && !urlValue) || (inputMode === 'image' && images.length === 0)}
            >
              <div className="button-content">
                <div className="button-main">
                  {isLoading ? (
                    <>
                      <div className="spinner-border spinner-border-sm" role="status">
                        <span className="sr-only"></span>
                      </div>
                      <span>분석 중...</span>
                    </>
                  ) : (
                    <>
                      <span>JD 분석 시작</span>
                      <i className="fas fa-arrow-right button-icon"></i>
                    </>
                  )}
                </div>
                {!isLoading && (
                  <span className="button-subtitle">
                    AI 기반 JD 분석을 통해 핵심 정보를 빠르게 파악하세요.
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* 분석 결과 (조건부 렌더링) */}
      {analysisResult && (
        <div className="analysis-result">
          {analysisResult.error ? (
            <div className="analysis-section" style={{ color: 'red' }}>
              <h3 className="analysis-subtitle">오류 발생</h3>
              <p className="analysis-text">
                {analysisResult.error}
              </p>
            </div>
          ) : (
            <>
              <div className="analysis-section">
                <h3 className="analysis-subtitle">핵심 키워드</h3>
                <div className="badge-list">
                  {analysisResult.keywords?.map((keyword, index) => (
                    <span key={index} className="badge bg-primary-100 text-primary-600">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
              <div className="analysis-section">
                <h3 className="analysis-subtitle">자격 요건</h3>
                <p className="analysis-text">
                  {analysisResult.requirements}
                </p>
              </div>
              <div className="analysis-section">
                <h3 className="analysis-subtitle">우대 사항</h3>
                <p className="analysis-text">
                  {analysisResult.preferences}
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default JDAnalysisForm;
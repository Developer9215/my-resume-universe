/*
 * 파일 위치: src/components/jd/JDAnalysisForm.js
 */
import React, { useRef, useCallback } from 'react';
import { useJdAnalysis } from '../../hooks/useJdAnalysis';
import ErrorMessage from '../common/ErrorMessage';
import './JDAnalysisForm.css';

const JDAnalysisForm = ({ onAnalysisComplete, existingJDs, onSelectJD }) => {
    const {
        inputMode, setInputMode,
        jdText, setJdText,
        jdUrl, setJdUrl,
        uploadedImages,
        isAnalyzing,
        error,
        analysisResult,
        autoSaveStatus,
        isDragging, setIsDragging,
        hasContent,
        handleFileSelect,
        removeImage,
        clearDraft,
        handleAnalyze,
        handleResetAfterAnalysis,
        formatFileSize,
    } = useJdAnalysis();

    const fileInputRef = useRef(null);
    const dropZoneRef = useRef(null);
    
    // 컴포넌트 내에서 호출할 핸들러들
    const handleDragOver = useCallback((e) => {
        e.preventDefault(); e.stopPropagation(); setIsDragging(true);
    }, [setIsDragging]);
    
    const handleDragLeave = useCallback((e) => {
        e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    }, [setIsDragging]);
    
    const handleDrop = useCallback((e) => {
        e.preventDefault(); e.stopPropagation(); setIsDragging(false);
        handleFileSelect(e.dataTransfer.files);
    }, [handleFileSelect, setIsDragging]);

    const handleAnalyzeAndComplete = async () => {
        const result = await handleAnalyze();
        if (result) {
            onAnalysisComplete(result);
            handleResetAfterAnalysis();
        }
    };

    return (
        <div className="jd-analysis-section">
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">📄 채용공고 분석</h3>
                    <p className="card-subtitle">
                        채용공고를 입력하시면 AI가 핵심 키워드와 요구사항을 자동으로 분석해드립니다.
                    </p>
                </div>
                <div className="card-body">
                    <div className="input-mode-selector">
                        <h4 className="mode-title">입력 방식 선택</h4>
                        <div className="mode-options">
                            <label className={`mode-option ${inputMode === 'text' ? 'active' : ''}`}>
                                <input type="radio" name="inputMode" value="text" checked={inputMode === 'text'} onChange={() => setInputMode('text')} />
                                <div className="mode-content">
                                    <div className="mode-icon">📝</div>
                                    <div className="mode-info"><strong>텍스트 직접 입력</strong><p>채용공고 텍스트를 복사해서 붙여넣기</p></div>
                                </div>
                            </label>
                            <label className={`mode-option ${inputMode === 'image' ? 'active' : ''}`}>
                                <input type="radio" name="inputMode" value="image" checked={inputMode === 'image'} onChange={() => setInputMode('image')} />
                                <div className="mode-content">
                                    <div className="mode-icon">🖼️</div>
                                    <div className="mode-info"><strong>이미지 업로드</strong><p>채용공고 이미지 파일을 업로드 (JPG, PNG 등)</p></div>
                                </div>
                            </label>
                            <label className={`mode-option ${inputMode === 'url' ? 'active' : ''}`}>
                                <input type="radio" name="inputMode" value="url" checked={inputMode === 'url'} onChange={() => setInputMode('url')} />
                                <div className="mode-content">
                                    <div className="mode-icon">🔗</div>
                                    <div className="mode-info"><strong>URL 직접 입력</strong><p>잡코리아 채용공고 페이지 URL 붙여넣기</p></div>
                                </div>
                            </label>
                        </div>
                    </div>
                    {inputMode === 'text' && (
                        <div className="form-group">
                            <div className="textarea-header">
                                <label htmlFor="jd-text" className="form-label">채용공고 내용</label>
                                <div className="textarea-info">
                                    <span className="word-count">{jdText.length}자</span>
                                    {autoSaveStatus && (<span className="auto-save-status">💾 {autoSaveStatus}</span>)}
                                </div>
                            </div>
                            <textarea
                                id="jd-text" value={jdText} onChange={(e) => setJdText(e.target.value)}
                                placeholder="채용공고를 붙여넣어 주세요..." className="form-textarea jd-textarea" rows="12" disabled={isAnalyzing}
                            />
                            {jdText.trim() && (<div className="textarea-actions"><button type="button" onClick={clearDraft} className="btn btn-ghost btn-sm" disabled={isAnalyzing}>🗑️ 내용 지우기</button></div>)}
                        </div>
                    )}
                    {inputMode === 'image' && (
                        <div className="form-group">
                            <label className="form-label">채용공고 이미지</label>
                            <div ref={dropZoneRef} className={`image-drop-zone ${isDragging ? 'dragging' : ''} ${uploadedImages.length > 0 ? 'has-files' : ''}`}
                                onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}>
                                <div className="drop-zone-content">
                                    {uploadedImages.length === 0 ? (<><div className="drop-zone-icon">📁</div><h4>이미지를 드래그하거나 클릭해서 업로드</h4><p>JPG, PNG, WebP 파일 지원 (최대 10MB)</p><button type="button" className="upload-button">파일 선택</button></>) : (<><div className="drop-zone-icon">➕</div><p>추가 이미지 업로드</p></>)}
                                </div>
                            </div>
                            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={(e) => handleFileSelect(e.target.files)} style={{ display: 'none' }} />
                            {uploadedImages.length > 0 && (<div className="uploaded-images"><h4 className="images-title">업로드된 이미지 ({uploadedImages.length}장)</h4><div className="images-grid">
                                {uploadedImages.map((image) => (<div key={image.id} className="image-item">
                                    <div className="image-preview"><img src={image.preview} alt={image.name} /><button type="button" className="image-remove" onClick={(e) => { e.stopPropagation(); removeImage(image.id); }} title="이미지 제거">✕</button></div>
                                    <div className="image-info"><p className="image-name" title={image.name}>{image.name}</p><p className="image-size">{formatFileSize(image.size)}</p></div>
                                </div>))}
                            </div><div className="textarea-actions"><button type="button" onClick={clearDraft} className="btn btn-ghost btn-sm" disabled={isAnalyzing}>🗑️ 이미지 모두 삭제</button></div></div>
                            )}
                        </div>
                    )}
                    {inputMode === 'url' && (
                        <div className="form-group">
                            <label htmlFor="jd-url" className="form-label">채용공고 URL</label>
                            <input id="jd-url" type="url" value={jdUrl} onChange={(e) => setJdUrl(e.target.value)} placeholder="잡코리아 채용공고 URL을 입력해 주세요" className="form-input" disabled={isAnalyzing} />
                            {jdUrl.trim() && (<div className="textarea-actions"><button type="button" onClick={clearDraft} className="btn btn-ghost btn-sm" disabled={isAnalyzing}>🗑️ URL 지우기</button></div>)}
                        </div>
                    )}
                    {error && <ErrorMessage message={error} type="error" />}
                    <div className="jd-form-actions">
                        <button onClick={handleAnalyzeAndComplete} disabled={!hasContent || isAnalyzing} className={`btn btn-lg analyze-button ${!hasContent ? 'btn-disabled' : 'btn-primary'}`}>
                            {isAnalyzing ? (<><span className="spinner spinner-sm"></span> AI 분석 중...</>) : (<div className="button-content"><div className="button-main"><span className="button-icon">🤖</span>AI 분석 시작</div><div className="button-subtitle">{!hasContent ? '(내용 입력 시 활성화)' : inputMode === 'text' ? '(분석 준비 완료)' : inputMode === 'image' ? `(${uploadedImages.length}장 이미지 준비됨)` : `(URL 준비됨)`}</div></div>)}
                        </button>
                    </div>
                </div>
            </div>
            {analysisResult && (
                <div className="card mt-6">
                    <div className="card-header">
                        <h3 className="card-title">✅ 분석 결과</h3>
                    </div>
                    <div className="card-body">
                        <div className="analysis-result">
                            <div className="analysis-section">
                                <h4 className="analysis-subtitle">요약</h4>
                                <p className="analysis-text">{analysisResult.analysis.summary}</p>
                            </div>
                            <div className="analysis-section">
                                <h4 className="analysis-subtitle">핵심 키워드</h4>
                                <div className="badge-list">
                                    {analysisResult.analysis.keywords?.map((keyword, idx) => (<span key={idx} className="badge badge-primary">{keyword}</span>))}
                                </div>
                            </div>
                            {analysisResult.analysis.required_skills?.length > 0 && (<div className="analysis-section"><h4 className="analysis-subtitle">필수 스킬</h4><div className="badge-list">{analysisResult.analysis.required_skills.map((skill, idx) => (<span key={idx} className="badge badge-error">{skill}</span>))}</div></div>)}
                            {analysisResult.analysis.preferred_skills?.length > 0 && (<div className="analysis-section"><h4 className="analysis-subtitle">우대 스킬</h4><div className="badge-list">{analysisResult.analysis.preferred_skills.map((skill, idx) => (<span key={idx} className="badge badge-success">{skill}</span>))}</div></div>)}
                        </div>
                        <div className="analysis-actions">
                            <button onClick={() => onSelectJD(analysisResult)} className="btn btn-success btn-lg">🚀 이 JD로 이력서 생성하기</button>
                        </div>
                    </div>
                </div>
            )}
            {existingJDs && existingJDs.length > 0 && (
                <div className="card mt-6">
                    <div className="card-header">
                        <h3 className="card-title">📋 분석된 JD 목록</h3>
                    </div>
                    <div className="card-body">
                        <div className="jd-list">
                            {existingJDs.map(jd => (
                                <div key={jd.id} className="jd-item">
                                    <div className="jd-item-content">
                                        <h4 className="jd-item-title">{jd.title}</h4>
                                        <p className="jd-item-summary">{jd.summary}</p>
                                        <div className="jd-item-keywords">
                                            {jd.extracted_keywords?.slice(0, 3).map((keyword, idx) => (<span key={idx} className="badge badge-gray">{keyword}</span>))}
                                            {jd.extracted_keywords?.length > 3 && (<span className="badge badge-gray">+{jd.extracted_keywords.length - 3}개 더</span>)}
                                        </div>
                                    </div>
                                    <div className="jd-item-actions">
                                        <button onClick={() => onSelectJD({ ...jd, analysis: { keywords: jd.extracted_keywords || [], summary: jd.summary || '', required_skills: [], preferred_skills: [], key_responsibilities: [] } })} className="btn btn-primary btn-sm">이력서 생성</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JDAnalysisForm;
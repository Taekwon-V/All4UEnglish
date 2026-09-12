import React, { useState, useRef, useEffect } from 'react';
import './CropCanvas.css';

/**
 * 터치 및 마우스 드래그로 이미지 속 특정 문장 구역(Crop Area)을 지정하는 직관적인 캔버스
 */
export default function CropCanvas({ imageSrc, onCropDone, onCancel }) {
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const [startPos, setStartPos] = useState(null);
  const [cropBox, setCropBox] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // 좌표 계산 헬퍼
  const getCoordinates = (e) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: Math.max(0, Math.min(clientX - rect.left, rect.width)),
      y: Math.max(0, Math.min(clientY - rect.top, rect.height))
    };
  };

  const handlePointerDown = (e) => {
    const coords = getCoordinates(e);
    setStartPos(coords);
    setCropBox({ x: coords.x, y: coords.y, width: 0, height: 0 });
    setIsDragging(true);
  };

  const handlePointerMove = (e) => {
    if (!isDragging || !startPos) return;
    const current = getCoordinates(e);
    
    const x = Math.min(startPos.x, current.x);
    const y = Math.min(startPos.y, current.y);
    const width = Math.abs(current.x - startPos.x);
    const height = Math.abs(current.y - startPos.y);

    setCropBox({ x, y, width, height });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // 선택한 영역을 Base64 이미지로 잘라내기
  const handleExtractCrop = () => {
    if (!imgRef.current || !cropBox || cropBox.width < 10 || cropBox.height < 10) {
      // 선택 영역이 없으면 전체 이미지 전송
      onCropDone(imageSrc);
      return;
    }

    const img = imgRef.current;
    const container = containerRef.current;
    
    // 원본 이미지 대비 화면 렌더링 비율 계산
    const scaleX = img.naturalWidth / container.clientWidth;
    const scaleY = img.naturalHeight / container.clientHeight;

    const canvas = document.createElement('canvas');
    canvas.width = cropBox.width * scaleX;
    canvas.height = cropBox.height * scaleY;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(
      img,
      cropBox.x * scaleX,
      cropBox.y * scaleY,
      cropBox.width * scaleX,
      cropBox.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const croppedBase64 = canvas.toDataURL('image/jpeg', 0.95);
    onCropDone(croppedBase64);
  };

  return (
    <div className="crop-modal-backdrop">
      <div className="crop-modal-sheet">
        <div className="crop-header">
          <div className="crop-title">
            <span className="crop-badge">구역 지정</span>
            <h3>원하는 문장을 네모로 드래그하세요</h3>
          </div>
          <p className="crop-guide">손가락이나 마우스로 책 속 문장 주변을 쓱 그어주세요.</p>
        </div>

        <div 
          className="crop-canvas-wrapper" 
          ref={containerRef}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        >
          <img 
            ref={imgRef} 
            src={imageSrc} 
            alt="Target" 
            className="crop-source-image" 
            draggable={false}
          />
          
          {cropBox && cropBox.width > 0 && (
            <div 
              className="crop-selection-box"
              style={{
                left: `${cropBox.x}px`,
                top: `${cropBox.y}px`,
                width: `${cropBox.width}px`,
                height: `${cropBox.height}px`
              }}
            >
              <div className="crop-handle handle-nw" />
              <div className="crop-handle handle-ne" />
              <div className="crop-handle handle-sw" />
              <div className="crop-handle handle-se" />
              <div className="crop-glow-label">선택된 문장 구역</div>
            </div>
          )}
        </div>

        <div className="crop-actions">
          <button type="button" className="crop-btn secondary" onClick={onCancel}>
            취소
          </button>
          <button type="button" className="crop-btn primary" onClick={handleExtractCrop}>
            ✨ 이 구역 문장 인식하기
          </button>
        </div>
      </div>
    </div>
  );
}

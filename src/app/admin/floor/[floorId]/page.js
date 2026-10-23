// app/admin/floor/[floorId]/page.js
'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FLOORS } from '@/lib/constants'
import {
  applyFloorMapViewBoxCrop,
  getFloorMapZoom,
  getSvgMeetLayout,
  getSvgViewBoxSize,
  spotToOverlayPercent,
} from '@/lib/svg-map-layout'
import AdminBackLink from '@/components/admin/AdminBackLink'
import VendNavArrow from '@/components/VendNavArrow'

// Space type configurations used for border color display
const SPOT_TYPES = [
  { id: 'regular', name: 'Regular', color: '#fbbf24', icon: '🚗', description: 'Standard parking space' },
  { id: 'reserved', name: 'Reserved', color: '#ef4444', icon: '⭐', description: 'Reserved parking' },
  { id: 'compact', name: 'Compact', color: '#a855f7', icon: '🅿️', description: 'Compact car space' },
  { id: 'ev', name: 'EV', color: '#10b981', icon: '🔋', description: 'Electric vehicle charging' },
  { id: 'ada', name: 'ADA', color: '#3b82f6', icon: '♿', description: 'Handicap accessible' },
  { id: 'ada_ev', name: 'ADA + EV', color: '#1e40af', icon: '♿🔌', description: 'Handicap with EV charging' },
];

export default function AdminFloorPage() {
  const params = useParams()
  const floorId = params.floorId || '2'
  const router = useRouter()

  // Derive current index and label from floorId
  const currentIndex = FLOORS.findIndex(f => f.route === parseInt(floorId))
  const currentFloor = FLOORS[currentIndex] || { route: parseInt(floorId), label: `P?` }

  const [svgContent, setSvgContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [spots, setSpots] = useState([])
  const [selectedSpot, setSelectedSpot] = useState(null)
  const [hoveredSpotId, setHoveredSpotId] = useState(null)
  const [savingSpot, setSavingSpot] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [parkerName, setParkerName] = useState('')
  const [spotNumber, setSpotNumber] = useState('')
  const [spotType, setSpotType] = useState('regular')
  const [mapLayout, setMapLayout] = useState(null)
  const [isInitialDetectionDone, setIsInitialDetectionDone] = useState(false)
  const svgRef = useRef(null)
  const mapStageRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!svgRef.current) return
    svgRef.current.innerHTML = svgContent || ''
  }, [floorId, svgContent])

  // Load SVG
  useEffect(() => {
    const loadSVG = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch(`/overlays/parking_page_${floorId}.svg`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const text = await res.text()
        setSvgContent(text)
      } catch (err) {
        console.error('Failed to load SVG:', err)
        setError('SVG not available for this floor')
        setSvgContent('')
      } finally {
        setLoading(false)
      }
    }

    loadSVG()
  }, [floorId])

  // ==================== DETECTION - ONLY YELLOW ====================
  
  const normalizeColor = (color) => {
    if (!color) return '';
    color = color.toLowerCase().trim();
    
    if (color.startsWith('rgb')) {
      const match = color.match(/\d+/g);
      if (match && match.length >= 3) {
        const r = parseInt(match[0]).toString(16).padStart(2, '0');
        const g = parseInt(match[1]).toString(16).padStart(2, '0');
        const b = parseInt(match[2]).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
      }
    }
    
    if (color.match(/^[0-9a-f]{6}$/i)) {
      return `#${color}`;
    }
    
    return color.replace(/\s+/g, '');
  };

  const detectSpotsFromSVG = (svgElement) => {
    console.log('=== DETECTING YELLOW PARKING SPOTS ONLY ===');
    
    const spots = [];
    const allElements = svgElement.querySelectorAll('*');

    // Space numbers (e.g. "3-146") are <text> elements drawn inside each yellow box.
    const textLabels = Array.from(svgElement.querySelectorAll('text'))
      .map(textEl => {
        const rect = textEl.getBoundingClientRect();
        return { text: textEl.textContent.trim(), cx: rect.x + rect.width / 2, cy: rect.y + rect.height / 2 };
      })
      .filter(label => label.text);

    allElements.forEach((element, index) => {
      if (element.tagName.toLowerCase() !== 'rect' && 
          element.tagName.toLowerCase() !== 'polygon' && 
          element.tagName.toLowerCase() !== 'path' &&
          element.tagName.toLowerCase() !== 'circle' &&
          element.tagName.toLowerCase() !== 'ellipse') {
        return;
      }
      
      try {
        const computedStyle = window.getComputedStyle(element);
        const fillColor = computedStyle.fill;
        
        if (!fillColor || fillColor === 'none') return;
        
        const normalizedColor = normalizeColor(fillColor);
        const isYellow = normalizedColor.includes('ffff80') || 
                        normalizedColor.includes('ffff7f') || 
                        normalizedColor.includes('ffff81') ||
                        normalizedColor === '#ffff80' ||
                        normalizedColor === '#ff0' ||
                        normalizedColor === '#ffff00';
        
        if (!isYellow) return;
        
        const bbox = element.getBBox();
        
        if (bbox.width < 15 || bbox.height < 15) return;
        
        const svgPoint = svgElement.createSVGPoint();
        const points = [
          { x: bbox.x, y: bbox.y },
          { x: bbox.x + bbox.width, y: bbox.y },
          { x: bbox.x, y: bbox.y + bbox.height },
          { x: bbox.x + bbox.width, y: bbox.y + bbox.height }
        ];
        
        const screenPoints = points.map(point => {
          svgPoint.x = point.x;
          svgPoint.y = point.y;
          return svgPoint.matrixTransform(svgElement.getScreenCTM());
        });
        
        const screenX = Math.min(...screenPoints.map(p => p.x));
        const screenY = Math.min(...screenPoints.map(p => p.y));
        const screenWidth = Math.max(...screenPoints.map(p => p.x)) - screenX;
        const screenHeight = Math.max(...screenPoints.map(p => p.y)) - screenY;
        
        const boxRect = element.getBoundingClientRect();
        const labelsInside = textLabels.filter(label =>
          label.cx >= boxRect.left && label.cx <= boxRect.right &&
          label.cy >= boxRect.top && label.cy <= boxRect.bottom
        );
        const svgSpotNumber = labelsInside.length === 1 ? labelsInside[0].text : null;

        const spot = {
          id: `detected_${floorId}_${index}_${Date.now()}`,
          svgX: bbox.x,
          svgY: bbox.y,
          svgWidth: bbox.width,
          svgHeight: bbox.height,
          screenX,
          screenY,
          screenWidth,
          screenHeight,
          color: normalizedColor,
          type: 'regular',
          elementType: element.tagName.toLowerCase(),
          companyName: 'Unassigned',
          parkerName: null,
          spotNumber: svgSpotNumber || `SPOT-${index + 1}`,
          originalSpotNumber: svgSpotNumber,
          hasText: !!svgSpotNumber,
          rawElement: element,
          shapeIndex: index,
          isCustomLabeled: false,
          isFromDatabase: false,
          dbId: null
        };
        
        spots.push(spot);
        
      } catch (err) {
        console.error(`Error processing element ${index}:`, err);
      }
    });
    
    console.log(`=== DETECTED ${spots.length} YELLOW SPOTS ===`);
    return spots;
  };

  // ==================== MAIN FLOW ====================
  
  useEffect(() => {
    if (!svgRef.current || loading || error || !svgContent) return

    const timer = setTimeout(async () => {
      const svgElement = svgRef.current?.querySelector('svg')
      if (!svgElement) return

      updateMapLayout();
      
      console.log('🚀 ===== PARKING SPOT MANAGEMENT FLOW =====');
      
      try {
        console.log('1️⃣ DETECT: Scanning SVG for YELLOW parking spots...');
        const detectedSpots = detectSpotsFromSVG(svgElement);
        
        if (detectedSpots.length === 0) {
          console.log('❌ No yellow spots detected in SVG');
          setSpots([]);
          setIsInitialDetectionDone(true);
          return;
        }
        
        console.log('2️⃣ READ: Loading spots from database...');
        const { data: existingSpots, error: dbError } = await supabase
          .from('parking_spots')
          .select('*')
          .eq('floor_id', floorId)
        
        if (dbError) {
          console.error('❌ Database read error:', dbError);
          setSpots(detectedSpots);
          setIsInitialDetectionDone(true);
          return;
        }
        
        console.log(`📊 Found ${existingSpots?.length || 0} existing spots in database`);
        
        console.log('3️⃣ COMPARE: Matching detected spots with database...');
        const existingSpotMap = new Map();
        const spotsToSave = [];
        
        if (existingSpots) {
          existingSpots.forEach(spot => {
            const key = `${Math.round(spot.svg_x)}_${Math.round(spot.svg_y)}`;
            existingSpotMap.set(key, spot);
          });
        }
        
        detectedSpots.forEach(detectedSpot => {
          const key = `${Math.round(detectedSpot.svgX)}_${Math.round(detectedSpot.svgY)}`;
          const existingSpot = existingSpotMap.get(key);
          
          if (!existingSpot) {
            spotsToSave.push({
              floor_id: floorId,
              spot_identifier: `spot_${detectedSpot.svgX}_${detectedSpot.svgY}`,
              display_label: detectedSpot.companyName || 'Unassigned',
              custom_label: detectedSpot.parkerName || null,
              original_label: detectedSpot.spotNumber || 'Unlabeled',
              color: detectedSpot.color,
              spot_type: detectedSpot.type,
              svg_x: detectedSpot.svgX,
              svg_y: detectedSpot.svgY,
              svg_width: detectedSpot.svgWidth,
              svg_height: detectedSpot.svgHeight,
              is_custom_labeled: !!detectedSpot.parkerName,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          }
        });
        
        if (spotsToSave.length > 0) {
          console.log(`4️⃣ SAVE: Saving ${spotsToSave.length} new spots to database...`);
          
          const { data: savedSpots, error: saveError } = await supabase
            .from('parking_spots')
            .insert(spotsToSave)
            .select()
          
          if (saveError) {
            console.error('❌ Save error:', saveError);
          } else {
            console.log(`✅ Successfully saved ${savedSpots?.length || 0} new spots to database`);
          }
        } else {
          console.log('✅ No new spots to save - all detected spots already exist in database');
        }
        
        console.log('5️⃣ READ: Loading updated spots from database...');
        const { data: allDatabaseSpots, error: finalReadError } = await supabase
          .from('parking_spots')
          .select('*')
          .eq('floor_id', floorId)
        
        if (finalReadError) {
          console.error('❌ Final read error:', finalReadError);
          setSpots(detectedSpots);
          setIsInitialDetectionDone(true);
          return;
        }
        
        console.log('6️⃣ MERGE: Creating final spot list...');
        const finalSpots = detectedSpots.map(detectedSpot => {
          const matchingDbSpot = allDatabaseSpots?.find(dbSpot => 
            Math.abs(dbSpot.svg_x - detectedSpot.svgX) < 5 && 
            Math.abs(dbSpot.svg_y - detectedSpot.svgY) < 5
          );
          
          if (matchingDbSpot) {
            const spotType = matchingDbSpot.spot_type || 'regular';
            const spotTypeConfig = SPOT_TYPES.find(t => t.id === spotType) || SPOT_TYPES[0];
            
            return {
              id: matchingDbSpot.id,
              dbId: matchingDbSpot.id,
              spot_identifier: matchingDbSpot.spot_identifier,
              companyName: matchingDbSpot.display_label || 'Unassigned',
              parkerName: matchingDbSpot.custom_label,
              spotNumber: matchingDbSpot.original_label || 'Unlabeled',
              spotType: spotType,
              spotTypeConfig: spotTypeConfig,
              originalSpotNumber: detectedSpot.originalSpotNumber,
              color: matchingDbSpot.color,
              type: 'yellow',
              svgX: matchingDbSpot.svg_x,
              svgY: matchingDbSpot.svg_y,
              svgWidth: matchingDbSpot.svg_width,
              svgHeight: matchingDbSpot.svg_height,
              screenX: detectedSpot.screenX,
              screenY: detectedSpot.screenY,
              screenWidth: detectedSpot.screenWidth,
              screenHeight: detectedSpot.screenHeight,
              elementType: detectedSpot.elementType,
              hasText: detectedSpot.hasText,
              rawElement: detectedSpot.rawElement,
              shapeIndex: detectedSpot.shapeIndex,
              isCustomLabeled: matchingDbSpot.is_custom_labeled,
              isFromDatabase: true
            };
          }
          
          return {
            ...detectedSpot,
            isFromDatabase: false,
            spotType: 'regular',
            spotTypeConfig: SPOT_TYPES[0]
          };
        });
        
        finalSpots.sort((a, b) => {
          if (Math.abs(a.svgY - b.svgY) < 10) {
            return a.svgX - b.svgX;
          }
          return a.svgY - b.svgY;
        });
        
        console.log('7️⃣ DISPLAY: Rendering spots...');
        console.log(`📊 Total spots: ${finalSpots.length}`);
        console.log('✅ ===== FLOW COMPLETE =====');
        
        setSpots(finalSpots);
        setIsInitialDetectionDone(true);
        
      } catch (error) {
        console.error('❌ Error in spot management flow:', error);
        setSpots([]);
        setIsInitialDetectionDone(true);
      }
      
    }, 1000);

    return () => clearTimeout(timer);
  }, [svgContent, loading, error, floorId]);

  // ==================== UTILITY FUNCTIONS ====================

  const updateMapLayout = () => {
    const stage = mapStageRef.current
    if (!stage) return
    const svgElement = stage.querySelector('svg')
    if (!svgElement) return

    const crop = applyFloorMapViewBoxCrop(svgElement, floorId)
    const { width: vbWidth, height: vbHeight } = getSvgViewBoxSize(svgElement)
    const { width: containerWidth, height: containerHeight } = stage.getBoundingClientRect()
    setMapLayout(getSvgMeetLayout(vbWidth, vbHeight, containerWidth, containerHeight, {
      cropX: crop?.x ?? 0,
      cropY: crop?.y ?? 0,
      fit: 'meet',
      zoom: getFloorMapZoom(floorId),
    }))
  }

  useEffect(() => {
    if (!mapStageRef.current) return
    const observer = new ResizeObserver(() => updateMapLayout())
    observer.observe(mapStageRef.current)
    updateMapLayout()
    return () => observer.disconnect()
  }, [svgContent, loading, error, spots.length])

  const calculateSpotPosition = (spot) => spotToOverlayPercent(spot, mapLayout)

  // ==================== NAVIGATION ====================

  const goToNextFloor = () => {
    if (currentIndex < FLOORS.length - 1) {
      router.push(`/admin/floor/${FLOORS[currentIndex + 1].route}`)
    }
  }

  const goToPrevFloor = () => {
    if (currentIndex > 0) {
      router.push(`/admin/floor/${FLOORS[currentIndex - 1].route}`)
    }
  }

  // ==================== SPOT INTERACTIONS ====================

  const isSameSpot = (a, b) =>
    a && b && (a.id === b.id || (a.dbId != null && a.dbId === b.dbId))

  const handleSpotClick = (spot) => {
    setSelectedSpot(spot);
    setCompanyName(spot.companyName || 'Unassigned');
    setParkerName(spot.parkerName || '');
    setSpotNumber(spot.spotNumber || '');
    setSpotType(spot.spotType || 'regular');
  };

  const isUnassignedLabel = (name) => !name || ['unassigned', 'unlabeled'].includes(String(name).trim().toLowerCase());

  // Pending edits vs. what is saved for the selected space
  const pendingChanges = selectedSpot ? {
    companyName: (companyName.trim() || 'Unassigned') !== (selectedSpot.companyName || 'Unassigned'),
    parkerName: (parkerName.trim() || null) !== (selectedSpot.parkerName || null),
    spotType: (spotType || 'regular') !== (selectedSpot.spotType || 'regular'),
    spotNumber: (spotNumber.trim() || 'Unlabeled') !== (selectedSpot.spotNumber || 'Unlabeled'),
  } : {};
  const hasPendingChanges = Object.values(pendingChanges).some(Boolean);
  const companyOptions = [...new Set(spots.map(s => s.companyName).filter(name => !isUnassignedLabel(name)))].sort();

  const resetFormToSpot = (spot) => {
    setCompanyName(spot?.companyName || 'Unassigned');
    setParkerName(spot?.parkerName || '');
    setSpotNumber(spot?.spotNumber || '');
    setSpotType(spot?.spotType || 'regular');
  };

  // Write a set of field values for the selected space in one update, then sync local state
  const applySpotUpdate = async (values) => {
    const spotTypeConfig = SPOT_TYPES.find(t => t.id === values.spotType) || SPOT_TYPES[0];
    const { error } = await supabase.from('parking_spots').update({
      display_label: values.companyName,
      custom_label: values.parkerName,
      is_custom_labeled: !!values.parkerName,
      spot_type: values.spotType,
      original_label: values.spotNumber,
      updated_at: new Date().toISOString(),
    }).eq('id', selectedSpot.dbId)
    if (error) throw error;
    const patch = { ...values, isCustomLabeled: !!values.parkerName, spotTypeConfig };
    setSpots(spots.map(spot => spot.dbId === selectedSpot.dbId ? { ...spot, ...patch } : spot));
    setSelectedSpot(prev => ({ ...prev, ...patch }));
    resetFormToSpot({ ...selectedSpot, ...patch });
  };

  // SAVE all edited fields at once
  const saveSpotChanges = async () => {
    if (!selectedSpot?.dbId) { alert('⚠️ Please wait for the space to be saved to the database first'); return; }
    if (!hasPendingChanges) return;
    setSavingSpot(true);
    try {
      await applySpotUpdate({
        companyName: companyName.trim() || 'Unassigned',
        parkerName: parkerName.trim() || null,
        spotType: spotType || 'regular',
        spotNumber: spotNumber.trim() || 'Unlabeled',
      });
      alert('✅ Space details saved');
    } catch (error) {
      console.error('Error saving space details:', error);
      alert('❌ Failed to save space details: ' + error.message);
    } finally {
      setSavingSpot(false);
    }
  };

  // CLEAR ALL — back to an unassigned space. Keeps the space number and physical type (EV/ADA);
  // a Reserved type is an assignment, so it returns to Regular.
  const clearSpotDetails = async () => {
    if (!selectedSpot?.dbId) return;
    const label = selectedSpot.spotNumber || 'this space';
    if (!window.confirm(`Clear all details for ${label}?\n\nThis removes the company and parker and resets a Reserved space to Regular. The space number and EV/ADA type are kept.`)) return;
    setSavingSpot(true);
    try {
      const currentType = selectedSpot.spotType || 'regular';
      await applySpotUpdate({
        companyName: 'Unassigned',
        parkerName: null,
        spotType: currentType === 'reserved' ? 'regular' : currentType,
        spotNumber: selectedSpot.spotNumber || 'Unlabeled',
      });
      alert(`✅ ${label} cleared`);
    } catch (error) {
      console.error('Error clearing space details:', error);
      alert('❌ Failed to clear space details: ' + error.message);
    } finally {
      setSavingSpot(false);
    }
  };

  // ==================== MANUAL RE-DETECTION ====================

  const handleRedetectSpots = async () => {
    if (!svgRef.current) return;
    const confirmed = window.confirm('🔄 MANUAL RE-DETECTION\n\nThis will:\n1. Re-scan SVG for YELLOW spaces only\n2. Add NEW spaces to database\n3. Keep existing company/parker/space info\n\nContinue?');
    if (!confirmed) return;
    setLoading(true);
    try {
      const svgElement = svgRef.current?.querySelector('svg');
      if (!svgElement) { alert('SVG element not found'); return; }
      const detectedSpots = detectSpotsFromSVG(svgElement);
      if (detectedSpots.length === 0) { alert('❌ No yellow spaces detected in SVG'); return; }
      const { data: existingSpots, error: dbError } = await supabase.from('parking_spots').select('*').eq('floor_id', floorId)
      if (dbError) throw dbError;
      const existingSpotMap = new Map();
      const spotsToSave = [];
      if (existingSpots) { existingSpots.forEach(spot => { const key = `${Math.round(spot.svg_x)}_${Math.round(spot.svg_y)}`; existingSpotMap.set(key, spot); }); }
      detectedSpots.forEach(detectedSpot => {
        const key = `${Math.round(detectedSpot.svgX)}_${Math.round(detectedSpot.svgY)}`;
        if (!existingSpotMap.has(key)) {
          spotsToSave.push({ floor_id: floorId, spot_identifier: `spot_${detectedSpot.svgX}_${detectedSpot.svgY}`, display_label: 'Unassigned', custom_label: null, original_label: detectedSpot.originalSpotNumber || 'Unlabeled', color: detectedSpot.color, spot_type: 'regular', svg_x: detectedSpot.svgX, svg_y: detectedSpot.svgY, svg_width: detectedSpot.svgWidth, svg_height: detectedSpot.svgHeight, is_custom_labeled: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        }
      });
      if (spotsToSave.length > 0) {
        const { data: savedSpots, error: saveError } = await supabase.from('parking_spots').insert(spotsToSave).select()
        if (saveError) throw saveError;
      }
      const { data: allDatabaseSpots } = await supabase.from('parking_spots').select('*').eq('floor_id', floorId)
      const finalSpots = detectedSpots.map(detectedSpot => {
        const matchingDbSpot = allDatabaseSpots?.find(dbSpot => Math.abs(dbSpot.svg_x - detectedSpot.svgX) < 5 && Math.abs(dbSpot.svg_y - detectedSpot.svgY) < 5);
        if (matchingDbSpot) {
          const spotType = matchingDbSpot.spot_type || 'regular';
          return { ...detectedSpot, id: matchingDbSpot.id, dbId: matchingDbSpot.id, companyName: matchingDbSpot.display_label || 'Unassigned', parkerName: matchingDbSpot.custom_label, spotNumber: matchingDbSpot.original_label || 'Unlabeled', spotType, spotTypeConfig: SPOT_TYPES.find(t => t.id === spotType) || SPOT_TYPES[0], isCustomLabeled: matchingDbSpot.is_custom_labeled, isFromDatabase: true };
        }
        return { ...detectedSpot, isFromDatabase: false, spotType: 'regular', spotTypeConfig: SPOT_TYPES[0] };
      });
      finalSpots.sort((a, b) => Math.abs(a.svgY - b.svgY) < 10 ? a.svgX - b.svgX : a.svgY - b.svgY);
      setSpots(finalSpots);
      setSelectedSpot(null);
      alert(`✅ Re-detection complete!\n\n• Yellow spaces detected: ${detectedSpots.length}\n• New spaces added: ${spotsToSave.length}\n• Total in database: ${finalSpots.filter(s => s.isFromDatabase).length}`);
    } catch (error) {
      console.error('❌ Re-detection error:', error);
      alert(`❌ Error during re-detection: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ==================== RENDER FUNCTIONS ====================

  const renderInteractiveOverlay = () => {
    if (!svgContent || spots.length === 0 || !mapLayout) return null;
    const highlightColor = '#00CCBE';
    return (
      <div className="absolute inset-0 pointer-events-none">
        {spots.map((spot) => {
          const pos = calculateSpotPosition(spot);
          if (!pos) return null;
          const isSelected = isSameSpot(selectedSpot, spot);
          const isHovered = hoveredSpotId === (spot.dbId || spot.id);
          const isHighlighted = hoveredSpotId ? isHovered : isSelected;
          const isOccupied = spot.companyName !== 'Unassigned';
          const spotTypeConfig = spot.spotTypeConfig || SPOT_TYPES[0];
          const tooltipContent = isOccupied 
            ? `${spot.spotNumber} • ${spot.companyName} • ${spotTypeConfig.name}${spot.parkerName ? ` • Parker: ${spot.parkerName}` : ''}`
            : `${spot.spotNumber} • ${spotTypeConfig.name} • Available`;
          return (
            <div
              key={spot.dbId || spot.id}
              className={`absolute cursor-pointer transition-all duration-200 rounded pointer-events-auto group ${isHighlighted ? 'z-30' : ''}`}
              style={{
                left: pos.left,
                top: pos.top,
                width: pos.width,
                height: pos.height,
                backgroundColor: isHighlighted ? `${highlightColor}30` : 'transparent',
                boxShadow: isHighlighted ? `0 0 0 3px ${highlightColor}, 0 0 14px ${highlightColor}99` : 'none',
                zIndex: isHighlighted ? 30 : 1,
              }}
              onClick={() => handleSpotClick(spot)}
              onMouseEnter={() => setHoveredSpotId(spot.dbId || spot.id)}
              onMouseLeave={() => setHoveredSpotId(null)}
              title={tooltipContent}
            >
              {isHighlighted && (
                <div className="absolute left-1/2 bottom-full -translate-x-1/2 mb-1.5 pointer-events-none flex flex-col items-center z-30">
                  <div className="bg-vend-mint text-vend-black text-xs font-bold px-2.5 py-1 rounded-md shadow-lg whitespace-nowrap">
                    {spot.spotNumber}
                  </div>
                  <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-vend-mint -mt-px" />
                </div>
              )}
              {isHighlighted && (
                <div
                  className={`absolute inset-0 rounded pointer-events-none ${isSelected && !hoveredSpotId ? 'animate-pulse' : ''}`}
                  style={{ boxShadow: `inset 0 0 0 2px ${highlightColor}` }}
                />
              )}
              {isOccupied && <div className="absolute text-sm">🏢</div>}
              {!isOccupied && spot.isFromDatabase && <div className="absolute text-sm">💾</div>}
            </div>
          );
        })}
      </div>
    );
  };

  // ==================== MAIN RENDER ====================

  return (
    <>
      <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <AdminBackLink className="mb-2" />
              <h1 className="text-2xl font-bold text-gray-900">
                {currentFloor.label} - Parking Admin
              </h1>
            </div>
            
            <div className="flex flex-wrap gap-2 lg:mr-24">
              {currentIndex > 0 && (
                <button
                  onClick={goToPrevFloor}
                  className="nav-arrow inline-flex items-center gap-2 px-4 py-2 bg-vend-black text-vend-white font-semibold rounded-full hover:bg-vend-slate transition-colors text-sm"
                >
                  <VendNavArrow direction="left" className="h-4 w-4 text-vend-mint" />
                  {FLOORS[currentIndex - 1].label}
                </button>
              )}
              {currentIndex < FLOORS.length - 1 && (
                <button
                  onClick={goToNextFloor}
                  className="nav-arrow inline-flex items-center gap-2 px-4 py-2 bg-vend-black text-vend-white font-semibold rounded-full hover:bg-vend-slate transition-colors text-sm"
                >
                  {FLOORS[currentIndex + 1].label}
                  <VendNavArrow direction="right" className="h-4 w-4 text-vend-mint" />
                </button>
              )}
              <button
                onClick={handleRedetectSpots}
                className="px-4 py-2 bg-white text-vend-black font-semibold rounded-full border border-vend-concrete hover:bg-gray-50 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'Processing...' : '🔄 Re-detect Spaces'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Map */}
        <div ref={containerRef} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex-1 min-w-0">
          <div className="w-full h-[960px] lg:h-[calc(100vh-180px)] bg-white relative overflow-hidden">
            {loading && (
              <div className="text-center absolute inset-0 flex items-center justify-center bg-white z-10">
                <div>
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Detecting yellow parking spaces...</p>
                  <p className="text-sm text-gray-500">Scanning SVG and saving to database</p>
                </div>
              </div>
            )}
            
            {error && !loading && (
              <div className="text-center p-8 absolute inset-0 flex items-center justify-center bg-white">
                <div>
                  <div className="text-4xl mb-4">🏢</div>
                  <p className="text-gray-600">{currentFloor.label}</p>
                  <p className="text-sm text-gray-400 mt-2">{error}</p>
                </div>
              </div>
            )}

            {!loading && !error && svgContent && (
              <div ref={mapStageRef} className="relative w-full h-full overflow-hidden bg-white">
                <div
                  ref={svgRef}
                  className="absolute [&>svg]:h-full [&>svg]:w-full"
                  style={mapLayout ? {
                    left: mapLayout.offsetX,
                    top: mapLayout.offsetY,
                    width: mapLayout.renderedWidth,
                    height: mapLayout.renderedHeight,
                  } : {
                    inset: 0,
                    width: '100%',
                    height: '100%',
                  }}
                />
                {renderInteractiveOverlay()}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar — edit panel + space list */}
        {!loading && !error && (
          <div className="w-full lg:w-[340px] flex-shrink-0 flex flex-col gap-4 lg:max-h-[calc(100vh-180px)] min-h-0">
            {selectedSpot ? (
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm flex flex-col min-h-0 flex-1 order-1">
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                  <h3 className="font-medium text-gray-900">Edit Parking Space</h3>
                  <button
                    onClick={() => { setSelectedSpot(null); }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    ✕ Close
                  </button>
                </div>

                <div className="space-y-4 overflow-y-auto min-h-0 flex-1 pr-1">
                    {!selectedSpot.dbId && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">⚠️ Waiting for this space to be saved to the database before it can be edited.</p>
                    )}

                    {/* Company Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                      <input type="text" list="company-options" value={companyName} onChange={(e) => setCompanyName(e.target.value)} onFocus={(e) => { if (isUnassignedLabel(e.target.value)) setCompanyName(''); }} onBlur={(e) => { if (!e.target.value.trim()) setCompanyName('Unassigned'); }} disabled={!selectedSpot.dbId || savingSpot} className={`w-full px-3 py-2 border text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 ${pendingChanges.companyName ? 'border-blue-400 bg-blue-50/40' : 'border-gray-300'}`} placeholder="Unassigned" />
                      <datalist id="company-options">
                        {companyOptions.map(name => (<option key={name} value={name} />))}
                      </datalist>
                      <p className="text-xs text-gray-500 mt-1">Leave empty for an unassigned space.</p>
                    </div>

                    {/* Space Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Space Type (Border Color)</label>
                      <select value={spotType} onChange={(e) => setSpotType(e.target.value)} disabled={!selectedSpot.dbId || savingSpot} className={`w-full px-3 py-2 border text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 ${pendingChanges.spotType ? 'border-blue-400 bg-blue-50/40' : 'border-gray-300'}`}>
                        {SPOT_TYPES.map(type => (<option key={type.id} value={type.id}>{type.icon} {type.name} - {type.description}</option>))}
                      </select>
                    </div>

                    {/* Parker Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Parker Name (Hidden in UI)</label>
                      <input type="text" value={parkerName} onChange={(e) => setParkerName(e.target.value)} disabled={!selectedSpot.dbId || savingSpot} className={`w-full px-3 py-2 border text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 ${pendingChanges.parkerName ? 'border-blue-400 bg-blue-50/40' : 'border-gray-300'}`} placeholder="No parker assigned" />
                      <p className="text-xs text-gray-500 mt-1">Stored in the database only (not shown on the map).</p>
                    </div>

                    {/* Space Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Space Number</label>
                      <input type="text" value={spotNumber} onChange={(e) => setSpotNumber(e.target.value)} disabled={!selectedSpot.dbId || savingSpot} className={`w-full px-3 py-2 border text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 ${pendingChanges.spotNumber ? 'border-blue-400 bg-blue-50/40' : 'border-gray-300'}`} placeholder="Unlabeled" />
                    </div>
                </div>

                {/* Actions */}
                <div className="pt-4 mt-4 border-t border-gray-200 space-y-2 flex-shrink-0">
                  <div className="flex gap-2">
                    <button onClick={saveSpotChanges} disabled={!selectedSpot.dbId || !hasPendingChanges || savingSpot} className="flex-1 px-3 py-2 vend-btn-primary rounded-lg text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed">
                      {savingSpot ? 'Saving…' : hasPendingChanges ? 'Save changes' : 'No changes'}
                    </button>
                    <button onClick={() => resetFormToSpot(selectedSpot)} disabled={!hasPendingChanges || savingSpot} className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                      Discard
                    </button>
                  </div>
                  <button onClick={clearSpotDetails} disabled={!selectedSpot.dbId || savingSpot} className="w-full px-3 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                    Clear All (reset to unassigned)
                  </button>
                </div>
              </div>
            ) : null}

            <div className={`bg-white rounded-lg border border-gray-200 p-4 shadow-sm flex flex-col min-h-0 transition-all duration-200 ${selectedSpot ? 'flex-shrink-0' : 'flex-1'}`}>
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <h3 className="font-medium text-gray-900">Parking Spaces ({spots.length})</h3>
                <div className="text-xs text-gray-500 text-right">
                  <div className="text-blue-600">{spots.filter(s => s.companyName !== 'Unassigned').length} occupied</div>
                  <div className="text-green-600">{spots.filter(s => s.isFromDatabase).length} in DB</div>
                </div>
              </div>

              {spots.length > 0 ? (
                <div className={`grid grid-cols-1 gap-2 overflow-y-auto p-1 ${selectedSpot ? 'max-h-[9.25rem]' : 'min-h-0 flex-1'}`}>
                    {spots.map((spot) => {
                      const isOccupied = spot.companyName !== 'Unassigned';
                      const spotTypeConfig = spot.spotTypeConfig || SPOT_TYPES[0];
                      return (
                        <div
                          key={spot.dbId || spot.id}
                          className={`px-3 py-2 rounded-lg border cursor-pointer transition-all ${isSameSpot(selectedSpot, spot) ? 'ring-2 ring-blue-500 border-blue-300 bg-blue-50' : isOccupied ? 'border-blue-300 bg-blue-50/30' : 'border-gray-300 bg-gray-50/30'}`}
                          style={{ borderLeftColor: isOccupied ? '#3b82f6' : spotTypeConfig.color, borderLeftWidth: '4px' }}
                          onClick={() => handleSpotClick(spot)}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-lg leading-none shrink-0">{isOccupied ? '🏢' : (spot.isFromDatabase ? '💾' : '🚗')}</span>
                            <span className={`text-sm font-bold truncate ${isOccupied ? 'text-blue-700' : 'text-gray-700'}`}>{spot.spotNumber}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="mb-4">🚗</div>
                    <p>No yellow parking spaces detected.</p>
                    <p className="text-sm mt-1">SVG loaded, but no yellow-colored spaces found.</p>
                  </div>
                )}
            </div>

            {!selectedSpot && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center flex-shrink-0">
                <div className="text-gray-400 mb-2">👆</div>
                <p className="text-sm text-gray-600">Click on any yellow parking space to edit</p>
              </div>
            )}
          </div>
        )}
        </div>
    </>
  )
}
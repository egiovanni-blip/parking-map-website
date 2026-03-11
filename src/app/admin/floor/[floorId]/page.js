// app/admin/floor/[floorId]/page.js
'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

// Floor route → display label mapping (same as admin dashboard & home page)
const FLOORS = [
  { route: 2,  label: 'P3'  },
  { route: 3,  label: 'P4'  },
  { route: 4,  label: 'P5'  },
  { route: 5,  label: 'P6'  },
  { route: 6,  label: 'P7'  },
  { route: 7,  label: 'P8'  },
  { route: 8,  label: 'P9'  },
  { route: 9,  label: 'P10' },
  { route: 10, label: 'P11' },
  { route: 11, label: 'P12' },
  // route 12 skipped — P13 doesn't exist
  { route: 12, label: 'P14' },
  { route: 13, label: 'P15' },
  { route: 14, label: 'P16' },
  { route: 15, label: 'P17' },
  { route: 16, label: 'P18' },
  { route: 17, label: 'P18' },
]

// Spot type configurations - only used for unoccupied borders
const SPOT_TYPES = [
  { id: 'regular', name: 'Regular', color: '#fbbf24', icon: '🚗', description: 'Standard parking spot' },
  { id: 'reserved', name: 'Reserved', color: '#ef4444', icon: '⭐', description: 'Reserved parking' },
  { id: 'compact', name: 'Compact', color: '#a855f7', icon: '🅿️', description: 'Compact car spot' },
  { id: 'ev', name: 'EV', color: '#10b981', icon: '🔋', description: 'Electric vehicle charging' },
  { id: 'ada', name: 'ADA', color: '#3b82f6', icon: '♿', description: 'Handicap accessible' },
  { id: 'ada_ev', name: 'ADA + EV', color: '#1e40af', icon: '♿🔌', description: 'Handicap with EV charging' }
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
  const [editingCompany, setEditingCompany] = useState(false)
  const [editingParker, setEditingParker] = useState(false)
  const [editingSpotNumber, setEditingSpotNumber] = useState(false)
  const [editingSpotType, setEditingSpotType] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [parkerName, setParkerName] = useState('')
  const [spotNumber, setSpotNumber] = useState('')
  const [spotType, setSpotType] = useState('regular')
  const [containerRect, setContainerRect] = useState(null)
  const [isInitialDetectionDone, setIsInitialDetectionDone] = useState(false)
  const svgRef = useRef(null)
  const containerRef = useRef(null)

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
          spotNumber: `SPOT-${index + 1}`,
          originalSpotNumber: null,
          hasText: false,
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

      updateContainerRect();
      
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

  const updateContainerRect = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerRect({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      });
    }
  };

  useEffect(() => {
    window.addEventListener('resize', updateContainerRect);
    return () => window.removeEventListener('resize', updateContainerRect);
  }, []);

  const calculateSpotPosition = (spot) => {
    if (!containerRect || !spot) return null;
    
    const left = (spot.screenX - containerRect.left);
    const top = (spot.screenY - containerRect.top);
    const width = spot.screenWidth;
    const height = spot.screenHeight;
    
    return {
      left: `${(left / containerRect.width) * 100}%`,
      top: `${(top / containerRect.height) * 100}%`,
      width: `${(width / containerRect.width) * 100}%`,
      height: `${(height / containerRect.height) * 100}%`
    };
  };

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

  const handleSpotClick = (spot) => {
    setSelectedSpot(spot);
    setCompanyName(spot.companyName || 'Unassigned');
    setParkerName(spot.parkerName || '');
    setSpotNumber(spot.spotNumber || '');
    setSpotType(spot.spotType || 'regular');
  };

  const startEditingCompany = () => {
    if (!selectedSpot) return;
    setEditingCompany(true); setEditingParker(false); setEditingSpotNumber(false); setEditingSpotType(false);
  };

  const startEditingParker = () => {
    if (!selectedSpot) return;
    setEditingParker(true); setEditingCompany(false); setEditingSpotNumber(false); setEditingSpotType(false);
  };

  const startEditingSpotNumber = () => {
    if (!selectedSpot) return;
    setEditingSpotNumber(true); setEditingCompany(false); setEditingParker(false); setEditingSpotType(false);
  };

  const startEditingSpotType = () => {
    if (!selectedSpot) return;
    setEditingSpotType(true); setEditingCompany(false); setEditingParker(false); setEditingSpotNumber(false);
  };

  // SAVE Company Name
  const saveCompanyName = async () => {
    if (!selectedSpot || !selectedSpot.dbId) return;
    try {
      const companyToSave = companyName.trim() || 'Unassigned';
      const { error } = await supabase.from('parking_spots').update({ display_label: companyToSave, updated_at: new Date().toISOString() }).eq('id', selectedSpot.dbId)
      if (error) throw error;
      const updatedSpots = spots.map(spot => spot.dbId === selectedSpot.dbId ? { ...spot, companyName: companyToSave } : spot);
      setSpots(updatedSpots);
      setSelectedSpot(prev => ({ ...prev, companyName: companyToSave }));
      setEditingCompany(false);
      alert(`✅ Company name updated: "${companyToSave}"`);
    } catch (error) {
      console.error('Error saving company name:', error);
      alert('❌ Failed to update company name');
    }
  };

  // SAVE Parker Name
  const saveParkerName = async () => {
    if (!selectedSpot || !selectedSpot.dbId) return;
    try {
      const parkerToSave = parkerName.trim() || null;
      const { error } = await supabase.from('parking_spots').update({ custom_label: parkerToSave, is_custom_labeled: !!parkerToSave, updated_at: new Date().toISOString() }).eq('id', selectedSpot.dbId)
      if (error) throw error;
      const updatedSpots = spots.map(spot => spot.dbId === selectedSpot.dbId ? { ...spot, parkerName: parkerToSave, isCustomLabeled: !!parkerToSave } : spot);
      setSpots(updatedSpots);
      setSelectedSpot(prev => ({ ...prev, parkerName: parkerToSave, isCustomLabeled: !!parkerToSave }));
      setEditingParker(false);
      alert(parkerToSave ? `✅ Parker name saved: "${parkerToSave}"` : '✅ Parker name cleared');
    } catch (error) {
      console.error('Error saving parker name:', error);
      alert('❌ Failed to update parker name');
    }
  };

  // SAVE Spot Number
  const saveSpotNumber = async () => {
    if (!selectedSpot || !selectedSpot.dbId) { alert('⚠️ Please wait for the spot to be saved to the database first'); return; }
    try {
      const spotNumToSave = spotNumber.trim() || 'Unlabeled';
      if (spotNumToSave === selectedSpot.spotNumber) { setEditingSpotNumber(false); return; }
      const { error } = await supabase.from('parking_spots').update({ original_label: spotNumToSave, updated_at: new Date().toISOString() }).eq('id', selectedSpot.dbId)
      if (error) throw error;
      const updatedSpots = spots.map(spot => spot.dbId === selectedSpot.dbId ? { ...spot, spotNumber: spotNumToSave } : spot);
      setSpots(updatedSpots);
      setSelectedSpot(prev => ({ ...prev, spotNumber: spotNumToSave }));
      setEditingSpotNumber(false);
      alert(`✅ Spot number updated: "${spotNumToSave}"`);
    } catch (error) {
      console.error('Error saving spot number:', error);
      alert('❌ Failed to update spot number: ' + error.message);
    }
  };

  // SAVE Spot Type
  const saveSpotType = async () => {
    if (!selectedSpot || !selectedSpot.dbId) { alert('⚠️ Please wait for the spot to be saved to the database first'); return; }
    try {
      const spotTypeToSave = spotType || 'regular';
      const spotTypeConfig = SPOT_TYPES.find(t => t.id === spotTypeToSave) || SPOT_TYPES[0];
      const { error } = await supabase.from('parking_spots').update({ spot_type: spotTypeToSave, updated_at: new Date().toISOString() }).eq('id', selectedSpot.dbId)
      if (error) throw error;
      const updatedSpots = spots.map(spot => spot.dbId === selectedSpot.dbId ? { ...spot, spotType: spotTypeToSave, spotTypeConfig } : spot);
      setSpots(updatedSpots);
      setSelectedSpot(prev => ({ ...prev, spotType: spotTypeToSave, spotTypeConfig }));
      setEditingSpotType(false);
      alert(`✅ Spot type updated to: "${spotTypeConfig.name}"`);
    } catch (error) {
      console.error('Error saving spot type:', error);
      alert('❌ Failed to update spot type: ' + error.message);
    }
  };

  // ==================== MANUAL RE-DETECTION ====================

  const handleRedetectSpots = async () => {
    if (!svgRef.current) return;
    const confirmed = window.confirm('🔄 MANUAL RE-DETECTION\n\nThis will:\n1. Re-scan SVG for YELLOW spots only\n2. Add NEW spots to database\n3. Keep existing company/parker/spot info\n\nContinue?');
    if (!confirmed) return;
    setLoading(true);
    try {
      const svgElement = svgRef.current?.querySelector('svg');
      if (!svgElement) { alert('SVG element not found'); return; }
      const detectedSpots = detectSpotsFromSVG(svgElement);
      if (detectedSpots.length === 0) { alert('❌ No yellow spots detected in SVG'); return; }
      const { data: existingSpots, error: dbError } = await supabase.from('parking_spots').select('*').eq('floor_id', floorId)
      if (dbError) throw dbError;
      const existingSpotMap = new Map();
      const spotsToSave = [];
      if (existingSpots) { existingSpots.forEach(spot => { const key = `${Math.round(spot.svg_x)}_${Math.round(spot.svg_y)}`; existingSpotMap.set(key, spot); }); }
      detectedSpots.forEach(detectedSpot => {
        const key = `${Math.round(detectedSpot.svgX)}_${Math.round(detectedSpot.svgY)}`;
        if (!existingSpotMap.has(key)) {
          spotsToSave.push({ floor_id: floorId, spot_identifier: `spot_${detectedSpot.svgX}_${detectedSpot.svgY}`, display_label: 'Unassigned', custom_label: null, original_label: 'Unlabeled', color: detectedSpot.color, spot_type: 'regular', svg_x: detectedSpot.svgX, svg_y: detectedSpot.svgY, svg_width: detectedSpot.svgWidth, svg_height: detectedSpot.svgHeight, is_custom_labeled: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
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
      alert(`✅ Re-detection complete!\n\n• Yellow spots detected: ${detectedSpots.length}\n• New spots added: ${spotsToSave.length}\n• Total in database: ${finalSpots.filter(s => s.isFromDatabase).length}`);
    } catch (error) {
      console.error('❌ Re-detection error:', error);
      alert(`❌ Error during re-detection: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ==================== RENDER FUNCTIONS ====================

  const renderInteractiveOverlay = () => {
    if (!svgContent || spots.length === 0 || !containerRect) return null;
    return (
      <div className="absolute inset-0 pointer-events-none">
        {spots.map((spot) => {
          const pos = calculateSpotPosition(spot);
          if (!pos) return null;
          const isOccupied = spot.companyName !== 'Unassigned';
          const spotTypeConfig = spot.spotTypeConfig || SPOT_TYPES[0];
          const borderColor = isOccupied ? '#3b82f6' : spotTypeConfig.color;
          const tooltipContent = isOccupied 
            ? `${spot.spotNumber} • ${spot.companyName} • ${spotTypeConfig.name}${spot.parkerName ? ` • Parker: ${spot.parkerName}` : ''}`
            : `${spot.spotNumber} • ${spotTypeConfig.name} • Available`;
          return (
            <div
              key={spot.dbId || spot.id}
              className="absolute cursor-pointer transition-all duration-200 rounded pointer-events-auto group"
              style={{ left: pos.left, top: pos.top, width: pos.width, height: pos.height, backgroundColor: 'transparent', zIndex: 1 }}
              onClick={() => handleSpotClick(spot)}
              onMouseEnter={(e) => { e.currentTarget.style.zIndex = '10'; e.currentTarget.style.boxShadow = `0 0 0 2px ${borderColor}`; }}
              onMouseLeave={(e) => { e.currentTarget.style.zIndex = '1'; e.currentTarget.style.boxShadow = 'none'; }}
              title={tooltipContent}
            >
              {isOccupied && <div className="absolute text-sm">🏢</div>}
              {!isOccupied && spot.isFromDatabase && <div className="absolute text-sm">💾</div>}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${isOccupied ? 'bg-blue-600 text-white' : 'bg-black/70 text-white'}`}>
                  {spot.spotNumber}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ==================== MAIN RENDER ====================

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {currentFloor.label} - Parking Admin
              </h1>
              {!loading && !error && (
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm border border-gray-300"></div>
                    <span className="text-gray-600">
                      {spots.length} spots • {spots.filter(s => s.companyName !== 'Unassigned').length} occupied
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={goToPrevFloor}
                disabled={currentIndex <= 0}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← {currentIndex > 0 ? FLOORS[currentIndex - 1].label : 'Back'}
              </button>
              <button
                onClick={goToNextFloor}
                disabled={currentIndex >= FLOORS.length - 1}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {currentIndex < FLOORS.length - 1 ? FLOORS[currentIndex + 1].label : 'Next'} →
              </button>
              <button
                onClick={handleRedetectSpots}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                disabled={loading}
              >
                {loading ? 'Processing...' : '🔄 Re-detect Spots'}
              </button>
              <Link 
                href="/admin" 
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm flex items-center gap-2"
              >
                ← Admin Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* SVG Container */}
        <div ref={containerRef} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="w-full h-[900px] flex items-center justify-center bg-white relative">
            {loading && (
              <div className="text-center absolute inset-0 flex items-center justify-center bg-white z-10">
                <div>
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Detecting yellow parking spots...</p>
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
              <div ref={svgRef} className="relative w-full h-full overflow-hidden">
                <div className="absolute inset-0 w-full h-full flex items-center justify-center p-4 bg-white">
                  <div 
                    className="w-full h-full max-w-full max-h-full"
                    dangerouslySetInnerHTML={{ __html: svgContent }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  />
                </div>
                {renderInteractiveOverlay()}
              </div>
            )}
          </div>
        </div>

        {/* Selected Spot Panel */}
        {!loading && !error && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              {selectedSpot ? (
                <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-gray-900">Edit Parking Spot</h3>
                    <button
                      onClick={() => { setSelectedSpot(null); setEditingCompany(false); setEditingParker(false); setEditingSpotNumber(false); setEditingSpotType(false); }}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      ✕ Close
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Company Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                      {editingCompany ? (
                        <div className="space-y-2">
                          <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Enter company name..." autoFocus />
                          <div className="flex gap-2">
                            <button onClick={saveCompanyName} className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm" disabled={!selectedSpot.dbId}>{selectedSpot.dbId ? '💾 Save Company' : '⚠️ Not in DB'}</button>
                            <button onClick={() => { setEditingCompany(false); setCompanyName(selectedSpot.companyName || 'Unassigned'); }} className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <div className={`text-lg font-bold ${selectedSpot.companyName !== 'Unassigned' ? 'text-blue-700' : 'text-gray-500'}`}>{selectedSpot.companyName}</div>
                            <div className="text-xs text-gray-500 mt-1">{selectedSpot.companyName !== 'Unassigned' ? 'Occupied - Shows 🏢 icon' : 'Empty - Shows 💾 icon'}</div>
                          </div>
                          <button onClick={startEditingCompany} className="w-full px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm flex items-center justify-center gap-1" disabled={!selectedSpot.dbId}>
                            <span>🏢</span><span>{selectedSpot.dbId ? 'Edit Company' : 'Wait for DB Save'}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Spot Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Spot Type (Border Color)</label>
                      {editingSpotType ? (
                        <div className="space-y-2">
                          <select value={spotType} onChange={(e) => setSpotType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" autoFocus>
                            {SPOT_TYPES.map(type => (<option key={type.id} value={type.id}>{type.icon} {type.name} - {type.description}</option>))}
                          </select>
                          <div className="flex gap-2">
                            <button onClick={saveSpotType} className="flex-1 px-3 py-1.5 bg-green-600 text-black rounded-lg hover:bg-green-700 transition-colors text-sm" disabled={!selectedSpot.dbId}>{selectedSpot.dbId ? '🎨 Save Type' : '⚠️ Not in DB'}</button>
                            <button onClick={() => { setEditingSpotType(false); setSpotType(selectedSpot.spotType || 'regular'); }} className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="p-3 rounded-lg flex items-center gap-3 border" style={{ borderColor: selectedSpot.spotTypeConfig?.color || '#fbbf24' }}>
                            <div className="text-xl">{selectedSpot.spotTypeConfig?.icon || '🚗'}</div>
                            <div>
                              <div className="font-bold text-gray-900">{selectedSpot.spotTypeConfig?.name || 'Regular'}</div>
                              <div className="text-xs text-gray-500">{selectedSpot.companyName === 'Unassigned' ? 'Sets border color for unoccupied spots' : 'Shows in tooltip when hovering'}</div>
                            </div>
                          </div>
                          <button onClick={startEditingSpotType} className="w-full px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm flex items-center justify-center gap-1" disabled={!selectedSpot.dbId}>
                            <span>🎨</span><span>{selectedSpot.dbId ? 'Change Spot Type' : 'Wait for DB Save'}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Parker Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Parker Name (Hidden in UI)</label>
                      {editingParker ? (
                        <div className="space-y-2">
                          <input type="text" value={parkerName} onChange={(e) => setParkerName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Enter parker's full name..." autoFocus />
                          <div className="flex gap-2">
                            <button onClick={saveParkerName} className="flex-1 px-3 py-1.5 bg-gray-600 text-black rounded-lg hover:bg-gray-700 transition-colors text-sm" disabled={!selectedSpot.dbId}>{selectedSpot.dbId ? '👤 Save Parker' : '⚠️ Not in DB'}</button>
                            <button onClick={() => { setEditingParker(false); setParkerName(selectedSpot.parkerName || ''); }} className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm">Cancel</button>
                          </div>
                          <p className="text-xs text-gray-500">Parker name is stored but not shown visually on the map</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className={`p-3 rounded-lg ${selectedSpot.parkerName ? 'bg-gray-100 border border-gray-300' : 'bg-gray-50'}`}>
                            <div className={`font-bold ${selectedSpot.parkerName ? 'text-gray-700' : 'text-gray-500'}`}>{selectedSpot.parkerName || 'No parker assigned'}</div>
                            <div className="text-xs text-gray-500 mt-1">{selectedSpot.parkerName ? 'Stored in database only (not shown on map)' : 'Optional - for internal record keeping'}</div>
                          </div>
                          <button onClick={startEditingParker} className="w-full px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm flex items-center justify-center gap-1" disabled={!selectedSpot.dbId}>
                            <span>👤</span><span>{selectedSpot.dbId ? (selectedSpot.parkerName ? 'Edit Parker' : 'Add Parker') : 'Wait for DB Save'}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Spot Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Spot Number</label>
                      {editingSpotNumber ? (
                        <div className="space-y-2">
                          <input type="text" value={spotNumber} onChange={(e) => setSpotNumber(e.target.value)} className="w-full px-3 py-2 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Enter spot number (e.g., A1, B2)..." autoFocus />
                          <div className="flex gap-2">
                            <button onClick={saveSpotNumber} className="flex-1 px-3 py-1.5 bg-gray-700 text-black rounded-lg hover:bg-gray-800 transition-colors text-sm">🔢 Save Number</button>
                            <button onClick={() => { setEditingSpotNumber(false); setSpotNumber(selectedSpot.spotNumber || ''); }} className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <div className="text-xl font-bold text-gray-900">{selectedSpot.spotNumber || 'Unlabeled'}</div>
                            <div className="text-xs text-gray-500 mt-1">Shows on hover</div>
                          </div>
                          <button onClick={startEditingSpotNumber} className="w-full px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm flex items-center justify-center gap-1">
                            <span>🔢</span><span>Edit Spot Number</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                  <div className="text-gray-400 mb-2">👆</div>
                  <p className="text-sm text-gray-600">Click on any yellow parking spot to edit</p>
                </div>
              )}
            </div>

            {/* Spot List */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">Parking Spots ({spots.length})</h3>
                  <div className="text-sm text-gray-500">
                    <span className="text-blue-600">{spots.filter(s => s.companyName !== 'Unassigned').length} occupied</span>
                    {' • '}
                    <span className="text-green-600">{spots.filter(s => s.isFromDatabase).length} in DB</span>
                  </div>
                </div>
                
                {spots.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto p-1">
                    {spots.map((spot) => {
                      const isOccupied = spot.companyName !== 'Unassigned';
                      const spotTypeConfig = spot.spotTypeConfig || SPOT_TYPES[0];
                      return (
                        <div
                          key={spot.dbId || spot.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedSpot?.id === spot.id ? 'ring-2 ring-blue-500 border-blue-300 bg-blue-50' : isOccupied ? 'border-blue-300 bg-blue-50/30' : 'border-gray-300 bg-gray-50/30'}`}
                          style={{ borderLeftColor: isOccupied ? '#3b82f6' : spotTypeConfig.color, borderLeftWidth: '4px' }}
                          onClick={() => handleSpotClick(spot)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="text-xl">{isOccupied ? '🏢' : (spot.isFromDatabase ? '💾' : '🚗')}</div>
                              <span className={`text-lg font-bold ${isOccupied ? 'text-blue-700' : 'text-gray-700'}`}>{spot.spotNumber}</span>
                            </div>
                            {spot.isFromDatabase && <div className="text-xs text-green-600">✓</div>}
                          </div>
                          <div className="text-sm font-medium text-gray-900 truncate mb-1" title={spot.companyName}>{spot.companyName}</div>
                          <div className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: spotTypeConfig.color }} />
                            {spotTypeConfig.name}
                          </div>
                          {spot.parkerName ? (
                            <div className="text-xs text-gray-500 truncate" title={spot.parkerName}>👤 {spot.parkerName}</div>
                          ) : (
                            <div className="text-xs text-gray-500 italic">{isOccupied ? 'Company spot' : 'Available'}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="mb-4">🚗</div>
                    <p>No yellow parking spots detected.</p>
                    <p className="text-sm mt-1">SVG loaded, but no yellow-colored spots found.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
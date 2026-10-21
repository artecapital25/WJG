import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

export interface DayInfo {
  dateStr: string; // 'YYYY-MM-DD'
  dayNumber: number; // 1 - 31
  dayOfWeekShort: string; // 'L', 'M', 'M', 'J', 'V', 'S', 'D'
  dayOfWeekFull: string; // 'Lunes', 'Martes', etc.
  isToday: boolean;
  isSelected: boolean;
  isCurrentMonth: boolean;
}

export interface TouchSwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
}

export function useDateNavigation(initialDate: Date = new Date()) {
  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    return initialDate.toISOString().slice(0, 10);
  });

  // Detección reactiva de vista móvil (< 768px)
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return true;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const handleResize = () => setIsMobile(mediaQuery.matches);
    
    // Configurar listener compatible
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleResize);
    } else {
      window.addEventListener('resize', handleResize);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleResize);
      } else {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  const hoyStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Formateador de fecha a YYYY-MM-DD local (evitando problemas de zona horaria UTC)
  const formatDateLocal = useCallback((d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Días de la Semana Actual (Lunes a Domingo)
  const weekDays = useMemo<DayInfo[]>(() => {
    const base = new Date(currentDate);
    // En JS 0 es Domingo, convertir a Lunes = 1 .. Domingo = 7
    const dayOfWeek = base.getDay();
    const distanceToMonday = (dayOfWeek + 6) % 7;
    base.setDate(base.getDate() - distanceToMonday);

    const days: DayInfo[] = [];
    const DIAS_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    const DIAS_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const dateStr = formatDateLocal(d);

      days.push({
        dateStr,
        dayNumber: d.getDate(),
        dayOfWeekShort: DIAS_SHORT[i],
        dayOfWeekFull: DIAS_FULL[i],
        isToday: dateStr === hoyStr,
        isSelected: dateStr === selectedDateStr,
        isCurrentMonth: d.getMonth() === currentDate.getMonth()
      });
    }

    return days;
  }, [currentDate, selectedDateStr, hoyStr, formatDateLocal]);

  // Cuadrícula Mensual (Para Desktop / Tablets)
  const monthDays = useMemo<DayInfo[]>(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const startOffset = (firstDayIndex + 6) % 7; // Lunes = 0

    const days: DayInfo[] = [];
    const prevMonthDays = new Date(year, month, 0).getDate();

    // Días del mes previo para rellenar
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevDate = new Date(year, month - 1, d);
      const dateStr = formatDateLocal(prevDate);
      days.push({
        dateStr,
        dayNumber: d,
        dayOfWeekShort: '',
        dayOfWeekFull: '',
        isToday: dateStr === hoyStr,
        isSelected: dateStr === selectedDateStr,
        isCurrentMonth: false
      });
    }

    // Días del mes actual
    for (let i = 1; i <= totalDays; i++) {
      const currDate = new Date(year, month, i);
      const dateStr = formatDateLocal(currDate);
      days.push({
        dateStr,
        dayNumber: i,
        dayOfWeekShort: '',
        dayOfWeekFull: '',
        isToday: dateStr === hoyStr,
        isSelected: dateStr === selectedDateStr,
        isCurrentMonth: true
      });
    }

    // Días del mes siguiente
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      const dateStr = formatDateLocal(nextDate);
      days.push({
        dateStr,
        dayNumber: i,
        dayOfWeekShort: '',
        dayOfWeekFull: '',
        isToday: dateStr === hoyStr,
        isSelected: dateStr === selectedDateStr,
        isCurrentMonth: false
      });
    }

    return days;
  }, [currentDate, selectedDateStr, hoyStr, formatDateLocal]);

  // Navegación Semanal
  const nextWeek = useCallback(() => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  }, []);

  const prevWeek = useCallback(() => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }, []);

  // Navegación Mensual
  const nextMonth = useCallback(() => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  }, []);

  const prevMonth = useCallback(() => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  }, []);

  // Ir a Hoy
  const goToToday = useCallback(() => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateStr(formatDateLocal(today));
  }, [formatDateLocal]);

  // Selección de Fecha
  const selectDate = useCallback((dateStr: string) => {
    setSelectedDateStr(dateStr);
    const [y, m, d] = dateStr.split('-').map(Number);
    if (y && m && d) {
      setCurrentDate(new Date(y, m - 1, d));
    }
  }, []);

  // Gestos táctiles de Swipe (Deslizar semanas)
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchDeltaX = useRef<number>(0);
  const touchDeltaY = useRef<number>(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      touchDeltaX.current = 0;
      touchDeltaY.current = 0;
    }
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current !== null && touchStartY.current !== null && e.touches.length === 1) {
      touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
      touchDeltaY.current = e.touches[0].clientY - touchStartY.current;
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    if (touchStartX.current !== null) {
      const dx = touchDeltaX.current;
      const dy = touchDeltaY.current;
      // Solo disparar si el movimiento horizontal supera 45px y predomina sobre el vertical
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0) {
          nextWeek(); // Deslizar hacia la izquierda = semana siguiente
        } else {
          prevWeek(); // Deslizar hacia la derecha = semana anterior
        }
      }
      touchStartX.current = null;
      touchStartY.current = null;
    }
  }, [nextWeek, prevWeek]);

  // Nombre formateado del mes y año actual
  const monthYearLabel = useMemo(() => {
    const m = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    return m.charAt(0).toUpperCase() + m.slice(1);
  }, [currentDate]);

  // Nombre formateado del día seleccionado
  const selectedDayLabel = useMemo(() => {
    const [y, m, d] = selectedDateStr.split('-').map(Number);
    if (!y || !m || !d) return selectedDateStr;
    const dateObj = new Date(y, m - 1, d);
    const weekday = dateObj.toLocaleDateString('es-ES', { weekday: 'long' });
    const capitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    return `${capitalized}, ${d} de ${dateObj.toLocaleDateString('es-ES', { month: 'long' })}`;
  }, [selectedDateStr]);

  return {
    currentDate,
    selectedDateStr,
    isMobile,
    weekDays,
    monthDays,
    monthYearLabel,
    selectedDayLabel,
    hoyStr,
    selectDate,
    nextWeek,
    prevWeek,
    nextMonth,
    prevMonth,
    goToToday,
    touchHandlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd
    }
  };
}

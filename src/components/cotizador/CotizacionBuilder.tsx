import React from 'react';
import { CotizacionBuilderProps } from '../../features/cotizador/types/cotizador.types';
import { CotizacionBuilderView } from '../../features/cotizador/components/CotizacionBuilderView';

/**
 * CotizacionBuilder - Monolithic Facade Replaced by Modular 5-Layer Feature
 * WJGEEKS 3D PRO - Layer 5: Entry Delegator (< 20 lines)
 */
export const CotizacionBuilder: React.FC<CotizacionBuilderProps> = (props) => {
  return <CotizacionBuilderView {...props} />;
};

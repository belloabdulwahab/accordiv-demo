import logo from '../assets/accordiv-logo.svg';
import lightLogo from '../assets/accordiv-logo-light.svg';
import symbol from '../assets/accordiv-symbol.svg';

export default function AccordivLogo({ light = false, symbolOnly = false, decorative = false, className = '' }) {
  return <img className={`${symbolOnly ? 'accordiv-symbol' : 'accordiv-logo'} ${className}`.trim()}
    src={symbolOnly ? symbol : light ? lightLogo : logo} alt={decorative ? '' : 'Accordiv'}
    width={symbolOnly ? 492 : 1666} height={344} draggable="false" />;
}

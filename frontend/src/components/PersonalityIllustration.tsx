import React from 'react';
import { MbtiCode } from '../types/personality';

interface PersonalityIllustrationProps {
  code: MbtiCode;
  className?: string;
  title?: string;
}

interface Palette {
  bgFacet1: string;
  bgFacet2: string;
  coatMain: string;
  coatDark: string;
  coatLight: string;
  accent: string;
  accentBright: string;
}

const GROUP_PALETTES: Record<'analysts' | 'diplomats' | 'sentinels' | 'explorers', Palette> = {
  analysts: {
    bgFacet1: '#EFE5F6',
    bgFacet2: '#E4D4F0',
    coatMain: '#88619A',
    coatDark: '#674678',
    coatLight: '#A882BA',
    accent: '#C9A8DD',
    accentBright: '#F6E7B4',
  },
  diplomats: {
    bgFacet1: '#DFF3E8',
    bgFacet2: '#CCEBD9',
    coatMain: '#33A474',
    coatDark: '#237B55',
    coatLight: '#58C094',
    accent: '#9BDCC0',
    accentBright: '#F8DF9C',
  },
  sentinels: {
    bgFacet1: '#DEEFF6',
    bgFacet2: '#CBE4EE',
    coatMain: '#4298B4',
    coatDark: '#2C728A',
    coatLight: '#68B6CF',
    accent: '#A4D4E4',
    accentBright: '#F7D78C',
  },
  explorers: {
    bgFacet1: '#FBF0D1',
    bgFacet2: '#F6E3B0',
    coatMain: '#E4AE3A',
    coatDark: '#BD881D',
    coatLight: '#F1C865',
    accent: '#FAE09B',
    accentBright: '#8AC9B4',
  },
};

function getGroupFromCode(code: MbtiCode): 'analysts' | 'diplomats' | 'sentinels' | 'explorers' {
  if (['INTJ', 'INTP', 'ENTJ', 'ENTP'].includes(code)) return 'analysts';
  if (['INFJ', 'INFP', 'ENFJ', 'ENFP'].includes(code)) return 'diplomats';
  if (['ISTJ', 'ISFJ', 'ESTJ', 'ESFJ'].includes(code)) return 'sentinels';
  return 'explorers';
}

interface CharacterConfig {
  skin: string;
  skinShadow: string;
  hair: string;
  hairLight: string;
  shirt: string;
  smile: 'calm' | 'smirk' | 'warm' | 'joyful';
  glasses?: boolean;
  hairStyle: 'parted' | 'curly' | 'swept' | 'bob' | 'tousled' | 'braid' | 'wavy' | 'beret';
}

const CHARACTER_CONFIGS: Record<MbtiCode, CharacterConfig> = {
  INTJ: { skin: '#F5CFB8', skinShadow: '#E5B49A', hair: '#4B3832', hairLight: '#6B524A', shirt: '#FFFFFF', smile: 'calm', glasses: true, hairStyle: 'parted' },
  INTP: { skin: '#E9BC9E', skinShadow: '#D6A180', hair: '#2D2A32', hairLight: '#4A4552', shirt: '#F5F2F8', smile: 'calm', glasses: true, hairStyle: 'tousled' },
  ENTJ: { skin: '#D49A73', skinShadow: '#BC8059', hair: '#2B2220', hairLight: '#493B38', shirt: '#FFFFFF', smile: 'smirk', hairStyle: 'swept' },
  ENTP: { skin: '#F4C7AE', skinShadow: '#E0AC90', hair: '#8D5434', hairLight: '#AD6F4C', shirt: '#FFFFFF', smile: 'smirk', hairStyle: 'tousled' },

  INFJ: { skin: '#F2CBB4', skinShadow: '#DEB096', hair: '#3B3442', hairLight: '#584E62', shirt: '#F3FAF6', smile: 'calm', hairStyle: 'bob' },
  INFP: { skin: '#FCE0CC', skinShadow: '#EBC2A8', hair: '#9A6346', hairLight: '#B87E5F', shirt: '#FFFFFF', smile: 'warm', hairStyle: 'wavy' },
  ENFJ: { skin: '#C88964', skinShadow: '#AE704C', hair: '#272022', hairLight: '#43383B', shirt: '#FFFFFF', smile: 'warm', hairStyle: 'swept' },
  ENFP: { skin: '#E0A37E', skinShadow: '#C88862', hair: '#4A312C', hairLight: '#6A4942', shirt: '#FFFDF7', smile: 'joyful', hairStyle: 'curly' },

  ISTJ: { skin: '#F0C5AB', skinShadow: '#DBA98C', hair: '#3B4048', hairLight: '#59606B', shirt: '#FFFFFF', smile: 'calm', glasses: true, hairStyle: 'parted' },
  ISFJ: { skin: '#D99E79', skinShadow: '#BF835E', hair: '#3D2B24', hairLight: '#5A4138', shirt: '#F7FBFC', smile: 'warm', hairStyle: 'braid' },
  ESTJ: { skin: '#F6D1BA', skinShadow: '#E2B49A', hair: '#6E4C3B', hairLight: '#8E6753', shirt: '#FFFFFF', smile: 'calm', hairStyle: 'swept' },
  ESFJ: { skin: '#E7B18E', skinShadow: '#CF9571', hair: '#2D2524', hairLight: '#4B3E3C', shirt: '#FFFFFF', smile: 'joyful', hairStyle: 'wavy' },

  ISTP: { skin: '#EDBE9F', skinShadow: '#D6A17F', hair: '#312E33', hairLight: '#4E4A52', shirt: '#FFFDF6', smile: 'smirk', hairStyle: 'tousled' },
  ISFP: { skin: '#C98E6A', skinShadow: '#AF7552', hair: '#2E2623', hairLight: '#4A3D39', shirt: '#FFFFFF', smile: 'warm', hairStyle: 'beret' },
  ESTP: { skin: '#F4C9AD', skinShadow: '#DFAF90', hair: '#A6693B', hairLight: '#C58554', shirt: '#FFFFFF', smile: 'smirk', hairStyle: 'swept' },
  ESFP: { skin: '#B77854', skinShadow: '#9D603E', hair: '#241D1D', hairLight: '#3F3434', shirt: '#FFFDF4', smile: 'joyful', hairStyle: 'curly' },
};

export const PersonalityIllustration: React.FC<PersonalityIllustrationProps> = ({
  code,
  className = 'w-40 h-40',
  title,
}) => {
  const group = getGroupFromCode(code);
  const p = GROUP_PALETTES[group];
  const c = CHARACTER_CONFIGS[code];

  return (
    <svg
      viewBox="0 0 220 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={title || `${code} geometric character illustration`}
    >
      {/* Low-poly pastel geometric backdrop */}
      <polygon points="110,14 192,56 174,174 46,174 28,56" fill={p.bgFacet1} />
      <polygon points="110,14 192,56 110,104" fill={p.bgFacet2} opacity="0.7" />
      <polygon points="28,56 110,104 46,174" fill={p.bgFacet2} opacity="0.45" />
      <polygon points="46,174 174,174 110,206" fill={p.bgFacet2} opacity="0.65" />

      {/* Subtle geometric ground shadow */}
      <polygon points="48,196 172,196 154,205 66,205" fill={p.coatDark} opacity="0.13" />

      {/* Back Hair Layers for Long / Wavy / Bob Styles */}
      {c.hairStyle === 'wavy' && (
        <g>
          <polygon points="75,68 62,126 84,132 90,82" fill={c.hair} />
          <polygon points="145,68 158,126 136,132 130,82" fill={c.hair} />
          <polygon points="62,126 78,128 84,110" fill={c.hairLight} opacity="0.5" />
        </g>
      )}
      {c.hairStyle === 'bob' && (
        <g>
          <polygon points="76,65 65,116 86,118 90,78" fill={c.hair} />
          <polygon points="144,65 155,116 134,118 130,78" fill={c.hair} />
        </g>
      )}
      {c.hairStyle === 'braid' && (
        <g>
          <polygon points="78,74 66,118 82,124 88,82" fill={c.hair} />
          <polygon points="142,74 154,118 138,124 132,82" fill={c.hair} />
          <polygon points="144,118 154,132 142,144 136,130" fill={c.hairLight} />
        </g>
      )}
      {c.hairStyle === 'curly' && (
        <g>
          <polygon points="72,62 60,84 74,104 86,84" fill={c.hair} />
          <polygon points="148,62 160,84 146,104 134,84" fill={c.hair} />
          <polygon points="70,46 92,34 110,44 86,58" fill={c.hairLight} />
          <polygon points="150,46 128,34 110,44 134,58" fill={c.hair} />
        </g>
      )}

      {/* Torso / Coat / Tunic Facets */}
      <polygon points="60,196 74,128 110,120 110,196" fill={p.coatMain} />
      <polygon points="160,196 146,128 110,120 110,196" fill={p.coatDark} />
      <polygon points="74,128 110,120 96,158 67,164" fill={p.coatLight} opacity="0.65" />
      <polygon points="146,128 110,120 124,158 153,164" fill={p.coatMain} opacity="0.8" />

      {/* Crisp Shirt V-Insert & Collar */}
      <polygon points="94,124 126,124 110,164" fill={c.shirt} />
      <polygon points="94,124 103,144 88,136" fill={p.accent} opacity="0.85" />
      <polygon points="126,124 117,144 132,136" fill={p.accent} opacity="0.65" />

      {/* Neck */}
      <polygon points="99,106 121,106 122,126 98,126" fill={c.skinShadow} />
      <polygon points="99,106 112,106 110,124 98,124" fill={c.skin} />

      {/* Ears */}
      <polygon points="77,78 83,75 84,91 78,90" fill={c.skinShadow} />
      <polygon points="143,78 137,75 136,91 142,90" fill={c.skinShadow} />

      {/* Low-Poly Head */}
      <polygon points="82,62 110,50 138,62 135,96 110,112 85,96" fill={c.skin} />
      <polygon points="110,50 138,62 135,96 110,112" fill={c.skinShadow} opacity="0.42" />
      <polygon points="85,96 110,112 110,98" fill={c.skinShadow} opacity="0.28" />

      {/* Hair Crown Variants */}
      {c.hairStyle === 'parted' && (
        <g>
          <polygon points="78,66 84,42 114,36 138,48 140,68 124,56 96,58" fill={c.hair} />
          <polygon points="84,42 114,36 106,54 84,56" fill={c.hairLight} />
        </g>
      )}
      {c.hairStyle === 'tousled' && (
        <g>
          <polygon points="76,68 78,46 98,32 116,40 132,34 142,54 140,68 122,54 96,56" fill={c.hair} />
          <polygon points="98,32 116,40 104,54 88,48" fill={c.hairLight} />
        </g>
      )}
      {c.hairStyle === 'swept' && (
        <g>
          <polygon points="79,66 82,42 110,33 139,44 141,66 120,52 94,54" fill={c.hair} />
          <polygon points="82,42 110,33 128,44 96,52" fill={c.hairLight} />
        </g>
      )}
      {(c.hairStyle === 'bob' || c.hairStyle === 'wavy' || c.hairStyle === 'braid') && (
        <g>
          <polygon points="77,68 82,42 110,35 138,42 143,68 124,54 110,58 94,54" fill={c.hair} />
          <polygon points="82,42 110,35 110,56 88,52" fill={c.hairLight} />
        </g>
      )}
      {c.hairStyle === 'curly' && (
        <g>
          <polygon points="74,64 78,40 100,32 118,38 136,38 144,58 136,68 118,52 96,54" fill={c.hair} />
          <polygon points="84,42 106,36 112,50 88,52" fill={c.hairLight} />
        </g>
      )}
      {c.hairStyle === 'beret' && (
        <g>
          <polygon points="78,66 84,48 136,48 141,66 122,55 96,55" fill={c.hair} />
          {/* Artist Beret */}
          <polygon points="76,52 94,32 134,34 144,48 110,52" fill={p.coatDark} />
          <polygon points="94,32 134,34 118,46 88,46" fill={p.coatMain} />
          <polygon points="108,32 113,26 116,33" fill={p.coatDark} />
        </g>
      )}

      {/* Facial Features */}
      <g>
        {/* Eyebrows */}
        <polygon points="91,71 103,69 103,72 91,73" fill={c.hair} />
        <polygon points="117,69 129,71 129,73 117,72" fill={c.hair} />

        {/* Eyes */}
        <circle cx="97" cy="79" r="2.7" fill="#232832" />
        <circle cx="123" cy="79" r="2.7" fill="#232832" />
        <circle cx="97.9" cy="78.1" r="0.8" fill="#FFFFFF" />
        <circle cx="123.9" cy="78.1" r="0.8" fill="#FFFFFF" />

        {/* Faceted Nose */}
        <polygon points="110,79 113,89 107,89" fill={c.skinShadow} opacity="0.7" />

        {/* Glasses */}
        {c.glasses && (
          <g stroke="#2F3542" strokeWidth="2" fill="none">
            <polygon points="88,74 105,74 104,85 89,85" fill="#FFFFFF" fillOpacity="0.18" />
            <polygon points="115,74 132,74 131,85 116,85" fill="#FFFFFF" fillOpacity="0.18" />
            <line x1="105" y1="78" x2="115" y2="78" />
          </g>
        )}

        {/* Expressions */}
        {c.smile === 'calm' && (
          <path d="M103 96 Q110 99 117 96" stroke="#7A493A" strokeWidth="2.1" strokeLinecap="round" fill="none" />
        )}
        {c.smile === 'smirk' && (
          <path d="M102 96 Q111 100 119 94" stroke="#7A493A" strokeWidth="2.1" strokeLinecap="round" fill="none" />
        )}
        {c.smile === 'warm' && (
          <path d="M101 95 Q110 102 119 95" stroke="#7A493A" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        )}
        {c.smile === 'joyful' && (
          <g>
            <path d="M100 94 Q110 105 120 94 Z" fill="#FFFFFF" stroke="#7A493A" strokeWidth="1.6" />
          </g>
        )}
      </g>

      {/* Archetype-Specific Geometric Props & Hands */}
      {code === 'INTJ' && (
        <g>
          {/* Architectural Blueprint */}
          <polygon points="128,144 186,132 180,178 122,190" fill="#FFFFFF" stroke={p.coatDark} strokeWidth="1.5" />
          <polygon points="134,150 176,141 172,172 130,181" fill={p.bgFacet1} />
          <line x1="138" y1="162" x2="170" y2="155" stroke={p.coatMain} strokeWidth="1.5" />
          <line x1="152" y1="148" x2="148" y2="176" stroke={p.coatMain} strokeWidth="1.5" />
          {/* Drafting Compass */}
          <polygon points="48,176 62,134 72,176 67,176 62,150 53,176" fill={p.accentBright} stroke={p.coatDark} strokeWidth="1.2" />
          <circle cx="62" cy="133" r="4" fill={p.coatDark} />
        </g>
      )}

      {code === 'INTP' && (
        <g>
          {/* Glowing Geometric Flask */}
          <polygon points="154,136 164,136 164,150 180,180 138,180 154,150" fill="#FFFFFF" stroke={p.coatDark} strokeWidth="1.6" />
          <polygon points="145,168 173,168 179,179 139,179" fill={p.accent} />
          {/* Orbiting Atom Prism */}
          <ellipse cx="56" cy="144" rx="18" ry="7" transform="rotate(-30 56 144)" stroke={p.coatMain} strokeWidth="1.6" fill="none" />
          <ellipse cx="56" cy="144" rx="18" ry="7" transform="rotate(30 56 144)" stroke={p.coatMain} strokeWidth="1.6" fill="none" />
          <circle cx="56" cy="144" r="4" fill={p.accentBright} stroke={p.coatDark} strokeWidth="1.2" />
        </g>
      )}

      {code === 'ENTJ' && (
        <g>
          {/* Rising Strategy Prism */}
          <polygon points="142,182 142,164 154,164 154,182" fill={p.accent} />
          <polygon points="157,182 157,152 169,152 169,182" fill={p.coatLight} />
          <polygon points="172,182 172,136 184,136 184,182" fill={p.accentBright} stroke={p.coatDark} strokeWidth="1.2" />
          {/* Command Baton */}
          <polygon points="42,164 76,136 80,141 46,169" fill={p.coatDark} />
          <polygon points="73,134 83,131 81,142" fill={p.accentBright} />
        </g>
      )}

      {code === 'ENTP' && (
        <g>
          {/* Idea Spark Diamond */}
          <polygon points="164,116 172,134 190,142 172,150 164,168 156,150 138,142 156,134" fill={p.accentBright} stroke={p.coatDark} strokeWidth="1.4" />
          {/* Speech / Debate Polygon */}
          <polygon points="36,134 74,134 74,158 58,158 48,168 50,158 36,158" fill="#FFFFFF" stroke={p.coatMain} strokeWidth="1.6" />
          <circle cx="48" cy="146" r="2.2" fill={p.coatMain} />
          <circle cx="55" cy="146" r="2.2" fill={p.coatMain} />
          <circle cx="62" cy="146" r="2.2" fill={p.coatMain} />
        </g>
      )}

      {code === 'INFJ' && (
        <g>
          {/* Warm Geometric Lantern */}
          <line x1="166" y1="126" x2="166" y2="140" stroke={p.coatDark} strokeWidth="2.5" />
          <polygon points="154,140 178,140 182,170 150,170" fill={p.accentBright} stroke={p.coatDark} strokeWidth="1.6" />
          <polygon points="158,146 174,146 176,164 156,164" fill="#FFF8DC" />
          <polygon points="148,170 184,170 178,177 154,177" fill={p.coatDark} />
          {/* Floating Geometric Leaf */}
          <polygon points="44,154 60,136 66,156 50,166" fill={p.coatLight} />
        </g>
      )}

      {code === 'INFP' && (
        <g>
          {/* Open Journal & Wildflower */}
          <polygon points="134,152 162,146 162,184 134,188" fill="#FFFFFF" stroke={p.coatDark} strokeWidth="1.5" />
          <polygon points="162,146 190,152 190,188 162,184" fill={p.bgFacet1} stroke={p.coatDark} strokeWidth="1.5" />
          {/* Geometric Wildflower */}
          <line x1="56" y1="184" x2="56" y2="146" stroke={p.coatDark} strokeWidth="2.5" />
          <polygon points="56,128 64,140 56,148 48,140" fill={p.accentBright} stroke={p.coatDark} strokeWidth="1.2" />
          <polygon points="42,142 54,136 56,148 46,152" fill={p.accent} />
          <polygon points="70,142 58,136 56,148 66,152" fill={p.accent} />
        </g>
      )}

      {code === 'ENFJ' && (
        <g>
          {/* Guiding Unity Banner */}
          <line x1="166" y1="114" x2="166" y2="192" stroke={p.coatDark} strokeWidth="3" />
          <polygon points="166,116 198,128 166,144" fill={p.accentBright} stroke={p.coatDark} strokeWidth="1.4" />
          <polygon points="166,122 186,129 166,138" fill={p.coatMain} />
          {/* Warm Sun Emblem */}
          <polygon points="54,134 64,146 54,158 44,146" fill={p.accentBright} stroke={p.coatDark} strokeWidth="1.3" />
        </g>
      )}

      {code === 'ENFP' && (
        <g>
          {/* Origami Birds & Confetti Prism */}
          <polygon points="152,126 172,114 168,136 184,142 158,144" fill={p.accentBright} stroke={p.coatDark} strokeWidth="1.3" />
          <polygon points="40,124 58,116 54,134 68,140 44,140" fill="#FFFFFF" stroke={p.coatMain} strokeWidth="1.3" />
          <polygon points="172,162 184,154 188,168 176,174" fill={p.coatLight} />
          <polygon points="44,162 56,156 58,170 46,172" fill={p.accentBright} />
        </g>
      )}

      {code === 'ISTJ' && (
        <g>
          {/* Structured Ledger Book */}
          <polygon points="136,142 180,142 180,186 136,186" fill="#FFFFFF" stroke={p.coatDark} strokeWidth="1.8" />
          <polygon points="136,142 146,142 146,186 136,186" fill={p.coatDark} />
          <line x1="153" y1="154" x2="173" y2="154" stroke={p.coatMain} strokeWidth="2" />
          <line x1="153" y1="164" x2="173" y2="164" stroke={p.coatMain} strokeWidth="2" />
          <line x1="153" y1="174" x2="167" y2="174" stroke={p.coatMain} strokeWidth="2" />
          {/* Check Badge */}
          <polygon points="44,146 66,146 66,168 44,168" fill={p.accentBright} stroke={p.coatDark} strokeWidth="1.4" />
          <polyline points="49,157 54,162 62,152" stroke={p.coatDark} strokeWidth="2.2" fill="none" />
        </g>
      )}

      {code === 'ISFJ' && (
        <g>
          {/* Protective Geometric Shield */}
          <polygon points="142,138 182,138 182,164 162,186 142,164" fill="#FFFFFF" stroke={p.coatDark} strokeWidth="1.8" />
          <polygon points="162,144 176,144 176,162 162,178" fill={p.accent} />
          <polygon points="154,154 170,154 162,166" fill={p.coatDark} />
          {/* Warm Teacup */}
          <polygon points="42,158 68,158 64,178 46,178" fill="#FFFFFF" stroke={p.coatDark} strokeWidth="1.5" />
          <path d="M68,162 Q76,162 76,168 Q76,174 66,174" stroke={p.coatDark} strokeWidth="1.8" fill="none" />
        </g>
      )}

      {code === 'ESTJ' && (
        <g>
          {/* Clipboard & Gavel */}
          <polygon points="140,140 182,140 182,186 140,186" fill={p.accentBright} stroke={p.coatDark} strokeWidth="1.6" />
          <polygon points="146,148 176,148 176,180 146,180" fill="#FFFFFF" />
          <polygon points="154,136 168,136 168,144 154,144" fill={p.coatDark} />
          <line x1="152" y1="158" x2="170" y2="158" stroke={p.coatMain} strokeWidth="2" />
          <line x1="152" y1="168" x2="170" y2="168" stroke={p.coatMain} strokeWidth="2" />
          {/* Gavel */}
          <polygon points="38,146 60,136 65,148 43,158" fill={p.coatDark} />
          <line x1="54" y1="152" x2="68" y2="180" stroke={p.coatDark} strokeWidth="3.5" strokeLinecap="round" />
        </g>
      )}

      {code === 'ESFJ' && (
        <g>
          {/* Hospitality Tray / Gift */}
          <polygon points="140,148 182,148 182,184 140,184" fill="#FFFFFF" stroke={p.coatDark} strokeWidth="1.6" />
          <rect x="158" y="148" width="6" height="36" fill={p.accentBright} />
          <rect x="140" y="163" width="42" height="6" fill={p.accentBright} />
          <polygon points="161,148 150,138 161,142 172,138" fill={p.coatMain} />
          {/* Heart Gem */}
          <polygon points="56,144 66,154 56,166 46,154" fill={p.accentBright} stroke={p.coatDark} strokeWidth="1.3" />
        </g>
      )}

      {code === 'ISTP' && (
        <g>
          {/* Geometric Wrench & Precision Gear */}
          <polygon points="150,132 162,132 166,146 160,152 160,184 152,184 152,152 146,146" fill="#E6EBF0" stroke={p.coatDark} strokeWidth="1.6" />
          <polygon points="152,132 160,132 158,142 154,142" fill={p.bgFacet1} />
          {/* Faceted Gear */}
          <polygon points="54,138 62,138 66,146 72,148 72,156 66,158 62,166 54,166 50,158 44,156 44,148 50,146" fill={p.coatLight} stroke={p.coatDark} strokeWidth="1.5" />
          <circle cx="58" cy="152" r="5" fill="#FFFFFF" stroke={p.coatDark} strokeWidth="1.5" />
        </g>
      )}

      {code === 'ISFP' && (
        <g>
          {/* Wooden Artist Palette & Brush */}
          <polygon points="136,154 166,140 188,158 176,184 142,182" fill="#FFFFFF" stroke={p.coatDark} strokeWidth="1.6" />
          <circle cx="154" cy="158" r="4.2" fill="#E26D5A" />
          <circle cx="168" cy="154" r="4.2" fill="#4298B4" />
          <circle cx="174" cy="168" r="4.2" fill="#33A474" />
          <circle cx="156" cy="173" r="3.5" fill={p.coatMain} />
          {/* Paintbrush */}
          <line x1="42" y1="180" x2="66" y2="140" stroke={p.coatDark} strokeWidth="3.5" strokeLinecap="round" />
          <polygon points="62,144 74,128 70,148" fill={p.accentBright} stroke={p.coatDark} strokeWidth="1.2" />
        </g>
      )}

      {code === 'ESTP' && (
        <g>
          {/* Geometric Megaphone & Kinetic Arrow */}
          <polygon points="140,156 176,134 184,168 142,166" fill="#FFFFFF" stroke={p.coatDark} strokeWidth="1.6" />
          <polygon points="164,141 176,134 184,168 170,167" fill={p.coatMain} />
          <polygon points="146,166 154,166 158,182 150,182" fill={p.coatDark} />
          {/* Lightning Arrow */}
          <polygon points="48,136 64,136 56,152 68,152 46,178 52,158 42,158" fill={p.accentBright} stroke={p.coatDark} strokeWidth="1.3" />
        </g>
      )}

      {code === 'ESFP' && (
        <g>
          {/* Stage Microphone & Spotlight Stars */}
          <line x1="164" y1="152" x2="152" y2="184" stroke={p.coatDark} strokeWidth="4" strokeLinecap="round" />
          <polygon points="158,136 176,138 178,152 162,156 154,146" fill={p.coatDark} />
          <polygon points="162,138 174,140 174,148 164,150" fill={p.accentBright} />
          {/* Spotlight Stars */}
          <polygon points="52,126 57,138 69,140 59,148 61,160 52,153 43,160 45,148 35,140 47,138" fill={p.accentBright} stroke={p.coatDark} strokeWidth="1.3" />
        </g>
      )}
    </svg>
  );
};

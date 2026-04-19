import { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRightLeft, MoonStar, Sparkles, SunMedium } from 'lucide-react-native';
import { radius, shadows, spacing, typography } from '../theme/theme';
import { useAppStore } from '../utils/store';
import { useCurrency, useTheme } from '../utils/theme';

type GlassPreferencesProps = {
  title?: string;
  subtitle?: string;
  style?: ViewStyle;
  compact?: boolean;
};

type SegmentOption<T extends string> = {
  key: T;
  label: string;
  icon: typeof MoonStar;
};

type SegmentProps<T extends string> = {
  label: string;
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
};

const RATE_STEP = 500;

function SegmentControl<T extends string>({ label, value, options, onChange }: SegmentProps<T>) {
  const c = useTheme();
  const s = useMemo(() => createStyles(c), [c]);

  return (
    <View style={s.segmentGroup}>
      <Text style={s.segmentLabel}>{label}</Text>
      <View style={s.segmentTrack}>
        {options.map((option) => {
          const active = option.key === value;
          const Icon = option.icon;

          return (
            <TouchableOpacity
              key={option.key}
              accessibilityRole="button"
              accessibilityLabel={`${label}: ${option.label}`}
              activeOpacity={0.9}
              style={[s.segmentButton, active && s.segmentButtonActive]}
              onPress={() => onChange(option.key)}
            >
              {active ? (
                <LinearGradient
                  colors={[c.primary, c.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              ) : null}
              <Icon size={15} color={active ? '#FFFFFF' : c.textSec} />
              <Text style={[s.segmentButtonText, active && s.segmentButtonTextActive]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export function GlassPreferences({
  title = 'Ko`rinish va valuta',
  subtitle = 'Dark/Light rejim va USD/UZS ko`rinishini shu yerdan boshqaring.',
  style,
  compact = false,
}: GlassPreferencesProps) {
  const c = useTheme();
  const s = useMemo(() => createStyles(c), [c]);
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const setCurrency = useAppStore((state) => state.setCurrency);
  const setExchangeRate = useAppStore((state) => state.setExchangeRate);
  const { currency, exchangeRate, formatPrice } = useCurrency();
  const [draftRate, setDraftRate] = useState(String(exchangeRate));

  useEffect(() => {
    setDraftRate(String(exchangeRate));
  }, [exchangeRate]);

  const applyRate = () => {
    const sanitized = Number(draftRate.replace(/[^\d]/g, ''));
    if (!sanitized) {
      setDraftRate(String(exchangeRate));
      return;
    }

    void setExchangeRate(sanitized);
  };

  const adjustRate = (delta: number) => {
    const nextRate = Math.max(1000, exchangeRate + delta);
    setDraftRate(String(nextRate));
    void setExchangeRate(nextRate);
  };

  return (
    <View style={[s.shell, compact && s.shellCompact, style]}>
      <LinearGradient
        colors={[
          c.statusBar === 'light' ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.14)',
          'rgba(255,255,255,0.02)',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={s.header}>
        <View style={s.badge}>
          <Sparkles size={14} color={c.primary} />
          <Text style={s.badgeText}>Apple-style controls</Text>
        </View>
        <Text style={s.title}>{title}</Text>
        <Text style={s.subtitle}>{subtitle}</Text>
      </View>

      <SegmentControl
        label="Interfeys"
        value={theme}
        onChange={(value) => { void setTheme(value); }}
        options={[
          { key: 'dark', label: 'Dark', icon: MoonStar },
          { key: 'light', label: 'Light', icon: SunMedium },
        ]}
      />

      <SegmentControl
        label="Narx ko`rinishi"
        value={currency}
        onChange={(value) => { void setCurrency(value); }}
        options={[
          { key: 'USD', label: 'USD', icon: ArrowRightLeft },
          { key: 'UZS', label: 'UZS', icon: ArrowRightLeft },
        ]}
      />

      <View style={s.rateCard}>
        <View style={s.rateHeader}>
          <View>
            <Text style={s.rateLabel}>1 USD kursi</Text>
            <Text style={s.rateCaption}>Narxlar real vaqt ko`rinishida almashtiriladi</Text>
          </View>
          <View style={s.ratePreview}>
            <Text style={s.ratePreviewValue}>{formatPrice(1250)}</Text>
            <Text style={s.ratePreviewLabel}>1250 USD namunasi</Text>
          </View>
        </View>

        <View style={s.rateControls}>
          <TouchableOpacity style={s.rateStepper} onPress={() => adjustRate(-RATE_STEP)} activeOpacity={0.85}>
            <Text style={s.rateStepperText}>-500</Text>
          </TouchableOpacity>

          <View style={s.rateInputWrap}>
            <TextInput
              value={draftRate}
              onChangeText={setDraftRate}
              onBlur={applyRate}
              onSubmitEditing={applyRate}
              keyboardType="numeric"
              returnKeyType="done"
              style={s.rateInput}
              placeholder="12800"
              placeholderTextColor={c.placeholder}
            />
            <Text style={s.rateUnit}>UZS</Text>
          </View>

          <TouchableOpacity style={s.rateStepper} onPress={() => adjustRate(RATE_STEP)} activeOpacity={0.85}>
            <Text style={s.rateStepperText}>+500</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const createStyles = (c: ReturnType<typeof useTheme>) => StyleSheet.create({
  shell: {
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.card,
    padding: spacing.lg,
    overflow: 'hidden',
    gap: spacing.md,
    ...shadows.md,
  },
  shellCompact: {
    padding: 20,
  },
  header: {
    gap: spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.primarySoft,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
  },
  badgeText: {
    ...typography.caption,
    color: c.primary,
    fontWeight: '700',
  },
  title: {
    ...typography.h3,
    color: c.text,
  },
  subtitle: {
    ...typography.body2,
    color: c.textSec,
  },
  segmentGroup: {
    gap: spacing.sm,
  },
  segmentLabel: {
    ...typography.label,
    color: c.textSec,
  },
  segmentTrack: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.inputBg,
    padding: spacing.xs,
  },
  segmentButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    overflow: 'hidden',
  },
  segmentButtonActive: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  segmentButtonText: {
    ...typography.button,
    color: c.textSec,
    fontSize: 14,
  },
  segmentButtonTextActive: {
    color: '#FFFFFF',
  },
  rateCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.inputBg,
    padding: spacing.md,
    gap: spacing.md,
  },
  rateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  rateLabel: {
    ...typography.h4,
    color: c.text,
  },
  rateCaption: {
    ...typography.caption,
    color: c.textSec,
    marginTop: spacing.xxs,
    maxWidth: 210,
  },
  ratePreview: {
    alignItems: 'flex-end',
  },
  ratePreviewValue: {
    ...typography.h4,
    color: c.text,
  },
  ratePreviewLabel: {
    ...typography.caption,
    color: c.textTer,
    marginTop: spacing.xxs,
  },
  rateControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rateStepper: {
    minWidth: 68,
    height: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.cardBorder,
  },
  rateStepperText: {
    ...typography.button,
    color: c.text,
    fontSize: 14,
  },
  rateInputWrap: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.surface,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rateInput: {
    flex: 1,
    ...typography.body1,
    color: c.text,
    paddingVertical: 0,
  },
  rateUnit: {
    ...typography.label,
    color: c.textTer,
  },
});

import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { useLanguage } from '@/lib/language-provider';
import { formatDateDisplay } from '@/lib/date-utils';
import { exactTripMatch, filterTrips, type PickerTrip } from '@/lib/trip-picker';

type Props = {
  trips: PickerTrip[];
  value: number | undefined;
  onChange: (tripId: number | undefined) => void;
};

function dates(trip: PickerTrip) {
  if (!trip.startsOn) return '';
  return `${formatDateDisplay(trip.startsOn) || trip.startsOn} — ${formatDateDisplay(trip.endsOn ?? '') || trip.endsOn || ''}`;
}

// Campo de filtro por viagem: digitar busca na hora (código exato seleciona
// direto) e o botão ☰ abre uma janela com a lista completa e busca.
export function TripPicker({ trips, value, onChange }: Props) {
  const colors = useColors();
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [modalQuery, setModalQuery] = useState('');
  const selected = trips.find((trip) => trip.id === value);
  const suggestions = query.trim() ? filterTrips(trips, query).slice(0, 8) : [];
  const modalTrips = filterTrips(trips, modalQuery);

  const choose = (tripId: number | undefined) => {
    onChange(tripId);
    setQuery('');
    setModalQuery('');
    setOpen(false);
  };
  const onType = (text: string) => {
    setQuery(text);
    const exact = exactTripMatch(trips, text);
    if (exact) choose(exact.id);
  };

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2">
        <View className="flex-1 flex-row items-center rounded-2xl border border-border bg-background px-4">
          <TextInput
            value={query}
            onChangeText={onType}
            placeholder={selected && !query ? `${selected.tripCode} · ${selected.destination}` : t('Pesquisar viagem (vazio = todas)')}
            placeholderTextColor={colors.muted}
            className="flex-1 py-3 text-foreground"
          />
          <Text className="text-lg text-muted">⌕</Text>
        </View>
        <Pressable
          onPress={() => { setModalQuery(''); setOpen(true); }}
          accessibilityLabel={t('Ver lista de viagens')}
          style={({ pressed }) => ({ borderColor: colors.border, backgroundColor: colors.background, opacity: pressed ? 0.7 : 1, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 })}
        >
          <Text className="text-base font-bold text-foreground">☰</Text>
        </Pressable>
      </View>

      {query.trim() ? (
        suggestions.length ? (
          suggestions.map((trip) => (
            <Pressable
              key={trip.id}
              onPress={() => choose(trip.id)}
              style={({ pressed }) => ({ borderColor: value === trip.id ? colors.primary : colors.border, backgroundColor: value === trip.id ? `${colors.primary}14` : colors.surface, opacity: pressed ? 0.72 : 1 })}
              className="w-full rounded-xl border px-4 py-3"
            >
              <Text className="text-sm font-semibold text-foreground">{trip.tripCode} · {trip.destination}</Text>
              <Text className="mt-0.5 text-xs text-muted">{[trip.travelerName, dates(trip)].filter(Boolean).join(' · ')}</Text>
            </Pressable>
          ))
        ) : (
          <Text className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">{t('Nenhuma viagem encontrada')}</Text>
        )
      ) : selected ? (
        <View className="flex-row items-center rounded-xl border border-primary/40 bg-primary/5 px-4 py-3">
          <Text className="flex-1 text-sm font-semibold text-primary">{selected.tripCode} · {selected.destination}</Text>
          <Pressable onPress={() => choose(undefined)}><Text className="text-sm font-bold text-primary">×</Text></Pressable>
        </View>
      ) : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 16 }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 16, maxHeight: '85%', width: '100%', maxWidth: 640, alignSelf: 'center' }}>
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-foreground">{t('Todas as viagens')}</Text>
              <Pressable onPress={() => setOpen(false)}><Text className="text-base font-bold text-muted">✕</Text></Pressable>
            </View>
            <TextInput
              value={modalQuery}
              onChangeText={setModalQuery}
              autoFocus
              placeholder={t('Pesquisar por código, destino ou viajante')}
              placeholderTextColor={colors.muted}
              style={{ borderColor: colors.border, color: colors.foreground, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10 }}
            />
            <ScrollView showsVerticalScrollIndicator>
              <Pressable
                onPress={() => choose(undefined)}
                style={({ pressed }) => ({ borderColor: value === undefined ? colors.primary : colors.border, backgroundColor: value === undefined ? `${colors.primary}14` : colors.background, opacity: pressed ? 0.72 : 1, marginBottom: 8 })}
                className="rounded-xl border px-4 py-3"
              >
                <Text className="text-sm font-semibold text-foreground">{t('Todas as viagens')}</Text>
              </Pressable>
              {modalTrips.length === 0 ? <Text className="px-2 py-3 text-sm text-muted">{t('Nenhuma viagem encontrada')}</Text> : null}
              {modalTrips.map((trip) => (
                <Pressable
                  key={trip.id}
                  onPress={() => choose(trip.id)}
                  style={({ pressed }) => ({ borderColor: value === trip.id ? colors.primary : colors.border, backgroundColor: value === trip.id ? `${colors.primary}14` : colors.background, opacity: pressed ? 0.72 : 1, marginBottom: 8 })}
                  className="rounded-xl border px-4 py-3"
                >
                  <View className="flex-row items-center justify-between gap-3">
                    <Text className="flex-1 text-sm font-bold text-foreground">{trip.tripCode} · {trip.destination}</Text>
                    {trip.status ? <Text className="text-xs font-semibold text-muted">{trip.status}</Text> : null}
                  </View>
                  <Text className="mt-0.5 text-xs text-muted">{[trip.travelerName, trip.clientName, dates(trip)].filter(Boolean).join(' · ')}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

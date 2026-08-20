import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { PrimaryButton, SectionHeader, StatusPill } from "@/components/app-ui";
import {
  expenses,
  fleetReservations,
  formatCurrency,
  parseKm,
  trips,
  vehicles,
} from "@/lib/demo-data";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

export default function TripDetailScreen() {
  const colors = useColors();
  const trip = trips[0];
  const reservation = fleetReservations.find((item) => item.tripId === trip.id);
  const vehicle = vehicles.find((item) => item.id === reservation?.vehicleId);
  const tripExpenses = expenses.filter((expense) => expense.tripId === trip.id);
  const spent = tripExpenses.reduce(
    (sum, expense) => sum + expense.quantity * expense.unitValue,
    0,
  );
  const [started, setStarted] = useState(Boolean(reservation?.departureKm));
  const [finished, setFinished] = useState(false);
  const [departureKm, setDepartureKm] = useState(
    reservation?.departureKm?.toString() ?? "",
  );
  const [returnKm, setReturnKm] = useState("");
  const [hasEvent, setHasEvent] = useState(false);
  const [eventNote, setEventNote] = useState("");

  const startTrip = () => {
    const km = parseKm(departureKm);
    if (!km) {
      Alert.alert(
        "Informe o KM de saída",
        "Digite a quilometragem antes de iniciar a viagem.",
      );
      return;
    }
    setStarted(true);
    Alert.alert(
      "Viagem iniciada",
      `Saída registrada em ${km.toLocaleString("pt-BR")} km.`,
    );
  };

  const finishTrip = () => {
    const km = parseKm(returnKm);
    if (!km || km < parseKm(departureKm)) {
      Alert.alert(
        "Confira o KM de retorno",
        "O KM de retorno deve ser maior ou igual ao KM de saída.",
      );
      return;
    }
    setFinished(true);
    Alert.alert(
      hasEvent ? "Viagem finalizada com evento" : "Viagem finalizada",
      hasEvent
        ? "O veículo foi sinalizado para avaliação do Administrativo."
        : `Percurso registrado: ${(km - parseKm(departureKm)).toLocaleString("pt-BR")} km.`,
    );
  };

  return (
    <ScreenContainer
      edges={["top", "bottom", "left", "right"]}
      className="px-5 pt-4"
    >
      <View className="w-full max-w-5xl flex-1 self-center">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          <Pressable onPress={() => router.back()} className="mb-5">
            <Text className="font-semibold text-primary">‹ Voltar</Text>
          </Pressable>
          <View className="flex-row items-start justify-between">
            <View>
              <Text className="text-xs font-bold tracking-wider text-muted">
                {trip.id}
              </Text>
              <Text className="mt-2 text-3xl font-bold text-foreground">
                {trip.destination}
              </Text>
              <Text className="mt-1 text-sm text-muted">
                {trip.startDate} — {trip.endDate} · {trip.client}
              </Text>
            </View>
            <StatusPill
              status={
                finished ? "Finalizada" : started ? "Em prestação" : trip.status
              }
            />
          </View>
          <View className="mt-6 flex-row gap-3">
            <View className="flex-1 rounded-2xl border border-border bg-surface p-4">
              <Text className="text-xs text-muted">Adiantamento</Text>
              <Text className="mt-2 text-lg font-bold text-foreground">
                {formatCurrency(trip.amount)}
              </Text>
            </View>
            <View className="flex-1 rounded-2xl border border-border bg-surface p-4">
              <Text className="text-xs text-muted">Despesas lançadas</Text>
              <Text className="mt-2 text-lg font-bold text-primary">
                {formatCurrency(spent)}
              </Text>
            </View>
          </View>

          <SectionHeader title="Controle da viagem de frota" />
          <View className="rounded-2xl border border-border bg-surface p-5">
            <View className="flex-row items-center">
              <View
                style={{ backgroundColor: `${colors.primary}18` }}
                className="h-11 w-11 items-center justify-center rounded-xl"
              >
                <IconSymbol name="car.fill" size={22} color={colors.primary} />
              </View>
              <View className="ml-3 flex-1">
                <Text className="font-bold text-foreground">
                  {vehicle
                    ? `${vehicle.brand} ${vehicle.model}`
                    : "Veículo não associado"}
                </Text>
                <Text className="mt-1 text-sm text-muted">
                  {vehicle
                    ? `${vehicle.plate} · Condutor: ${reservation?.driver}`
                    : "Solicitação enviada ao Administrativo"}
                </Text>
              </View>
            </View>
            <View className="mt-5 gap-3">
              <Text className="text-xs font-bold uppercase tracking-widest text-muted">
                KM do veículo
              </Text>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="mb-2 text-xs text-muted">Saída</Text>
                  <TextInput
                    value={departureKm}
                    onChangeText={setDepartureKm}
                    editable={!started}
                    keyboardType="numeric"
                    placeholder="Ex.: 74101"
                    placeholderTextColor={colors.muted}
                    className="rounded-xl border border-border bg-background px-4 py-3 text-foreground"
                  />
                </View>
                <View className="flex-1">
                  <Text className="mb-2 text-xs text-muted">Retorno</Text>
                  <TextInput
                    value={returnKm}
                    onChangeText={setReturnKm}
                    editable={started && !finished}
                    keyboardType="numeric"
                    placeholder="Ex.: 74820"
                    placeholderTextColor={colors.muted}
                    className="rounded-xl border border-border bg-background px-4 py-3 text-foreground"
                  />
                </View>
              </View>
              {!started ? (
                <PrimaryButton label="Iniciar viagem" onPress={startTrip} />
              ) : !finished ? (
                <PrimaryButton label="Finalizar viagem" onPress={finishTrip} />
              ) : (
                <View
                  style={{ backgroundColor: `${colors.success}18` }}
                  className="rounded-xl p-3"
                >
                  <Text className="font-semibold text-success">
                    Viagem finalizada e quilometragem registrada.
                  </Text>
                </View>
              )}
            </View>
            <View className="mt-6 border-t border-border pt-5">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="font-bold text-foreground">
                    Registro de eventos
                  </Text>
                  <Text className="mt-1 text-xs text-muted">
                    Multas, avarias ou outros acontecimentos
                  </Text>
                </View>
                <Pressable
                  onPress={() => setHasEvent((current) => !current)}
                  style={{
                    backgroundColor: hasEvent ? colors.warning : colors.border,
                  }}
                  className="h-7 w-12 justify-center rounded-full px-1"
                >
                  <View
                    style={{
                      backgroundColor: hasEvent ? "white" : colors.muted,
                      alignSelf: hasEvent ? "flex-end" : "flex-start",
                    }}
                    className="h-5 w-5 rounded-full"
                  />
                </Pressable>
              </View>
              {hasEvent ? (
                <View className="mt-4 gap-3">
                  <TextInput
                    value={eventNote}
                    onChangeText={setEventNote}
                    multiline
                    placeholder="Descreva a multa, avaria ou outro evento..."
                    placeholderTextColor={colors.muted}
                    className="min-h-[90px] rounded-xl border border-border bg-background px-4 py-3 text-foreground"
                  />
                  <Pressable
                    onPress={() =>
                      Alert.alert(
                        "Anexo de fotos",
                        "A seleção de fotos da avaria será aberta neste ponto.",
                      )
                    }
                    style={({ pressed }) => [
                      {
                        borderColor: colors.border,
                        borderWidth: 1,
                        borderRadius: 12,
                        padding: 12,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <IconSymbol
                      name="camera.fill"
                      size={18}
                      color={colors.primary}
                    />
                    <Text className="ml-2 font-bold text-primary">
                      Anexar fotos da avaria
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          </View>

          <SectionHeader title="Linha do tempo" />
          <View className="rounded-2xl border border-border bg-surface p-5">
            <TimelineItem
              title="Solicitação criada"
              detail="12 ago · Viajante"
              done
            />
            <TimelineItem
              title="Aprovada pela área"
              detail="13 ago · Carlos Mendes"
              done
            />
            <TimelineItem
              title="Liberada para viagem"
              detail="17 ago · Administrativo"
              done
            />
            <TimelineItem
              title="Prestação de contas"
              detail={finished ? "Finalizada agora" : "Em andamento"}
              done={finished}
              last
            />
          </View>
          <SectionHeader
            title="Despesas"
            action={`${tripExpenses.length} itens`}
          />
          <PrimaryButton
            label="Adicionar despesa"
            onPress={() => router.push("/expenses")}
          />
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

function TimelineItem({
  title,
  detail,
  done,
  last,
}: {
  title: string;
  detail: string;
  done: boolean;
  last?: boolean;
}) {
  const colors = useColors();
  return (
    <View className="flex-row">
      <View className="items-center">
        <View
          style={{
            backgroundColor: done ? colors.success : colors.background,
            borderColor: done ? colors.success : colors.border,
          }}
          className="h-6 w-6 items-center justify-center rounded-full border"
        >
          {done ? (
            <IconSymbol name="checkmark" size={14} color="white" />
          ) : null}
        </View>
        {!last ? (
          <View
            style={{ backgroundColor: colors.border }}
            className="h-9 w-px"
          />
        ) : null}
      </View>
      <View className="ml-3 pb-3">
        <Text className="font-bold text-foreground">{title}</Text>
        <Text className="mt-1 text-xs text-muted">{detail}</Text>
      </View>
    </View>
  );
}

import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { PrimaryButton, SectionHeader, StatusPill } from "@/components/app-ui";
import {
  expenses,
  formatCurrency,
  parseKm,
} from "@/lib/demo-data";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useLanguage } from "@/lib/language-provider";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { ReportExportActions } from "@/components/report-export-actions";

const STATUS_ORDER = [
  "Aguardando aprovação",
  "Aprovada",
  "Em preparação",
  "Liberada para viagem",
  "Em prestação",
  "Finalizada",
] as const;

export default function TripDetailScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.profile === "admin";
  const params = useLocalSearchParams<{ tripId?: string }>();
  const tripId = typeof params.tripId === "string" && /^\d+$/.test(params.tripId) ? Number(params.tripId) : undefined;

  const tripQuery = trpc.operations.trips.get.useQuery({ id: tripId as number }, { enabled: isAuthenticated && tripId !== undefined });
  const trip = tripQuery.data;

  const reservationQuery = trpc.operations.fleet.reservations.byTrip.useQuery(
    { id: tripId as number },
    { enabled: isAuthenticated && tripId !== undefined },
  );
  const reservation = reservationQuery.data ?? null;

  const availableVehiclesQuery = trpc.operations.fleet.vehicles.list.useQuery(
    { page: 1, pageSize: 50, status: "Disponível" },
    { enabled: isAdmin && Boolean(trip?.requiresFleetVehicle) },
  );

  const confirmAdvanceMutation = trpc.operations.trips.confirmAdvance.useMutation({
    onSuccess: () => { tripQuery.refetch(); Alert.alert("Adiantamento confirmado", "O depósito foi registrado com sucesso."); },
    onError: (err) => { Alert.alert("Não foi possível confirmar o depósito", err.message); },
  });
  const updateHotelNoteMutation = trpc.operations.trips.updateHotelNote.useMutation({
    onSuccess: () => { tripQuery.refetch(); Alert.alert("Dados do hotel salvos", "A observação foi atualizada com sucesso."); },
    onError: (err) => { Alert.alert("Não foi possível salvar os dados do hotel", err.message); },
  });
  const updateTransportMutation = trpc.operations.trips.update.useMutation({
    onSuccess: () => { tripQuery.refetch(); Alert.alert("Modalidade atualizada", "A forma de transporte da viagem foi alterada."); },
    onError: (err) => { Alert.alert("Não foi possível alterar a modalidade", err.message); },
  });
  const createReservationMutation = trpc.operations.fleet.reservations.create.useMutation({
    onSuccess: () => { tripQuery.refetch(); reservationQuery.refetch(); Alert.alert("Veículo alocado", "O veículo foi vinculado à viagem."); },
    onError: (err) => { Alert.alert("Não foi possível alocar o veículo", err.message); },
  });
  const updateReservationMutation = trpc.operations.fleet.reservations.update.useMutation({
    onSuccess: () => { tripQuery.refetch(); reservationQuery.refetch(); Alert.alert("Veículo alocado", "O veículo foi vinculado à viagem."); },
    onError: (err) => { Alert.alert("Não foi possível alocar o veículo", err.message); },
  });

  // Todos os hooks abaixo são sempre chamados, em toda renderização,
  // independentemente de a viagem já ter chegado ou não (regra do React).
  const tripExpenses = expenses.filter(
    (expense) => expense.tripId === String(trip?.id),
  );
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
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);
  const [hotelNoteDraft, setHotelNoteDraft] = useState<string | null>(null);
  const [depositAmountDraft, setDepositAmountDraft] = useState<string | null>(null);

  // Só a partir daqui decidimos o que renderizar.
  if (!tripId) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]} className="px-5 pt-4">
        <Pressable onPress={() => router.back()} className="mb-5">
          <Text className="font-semibold text-primary">‹ Voltar</Text>
        </Pressable>
        <Text className="text-foreground">Nenhuma viagem informada para exibir.</Text>
      </ScreenContainer>
    );
  }

  if (tripQuery.isLoading) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]} className="px-5 pt-4">
        <Text className="text-foreground">Carregando viagem...</Text>
      </ScreenContainer>
    );
  }

  if (tripQuery.isError || !trip) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]} className="px-5 pt-4">
        <Pressable onPress={() => router.back()} className="mb-5">
          <Text className="font-semibold text-primary">‹ Voltar</Text>
        </Pressable>
        <Text className="text-foreground">
          Não foi possível carregar os detalhes desta viagem.
        </Text>
        {tripQuery.error ? (
          <Text className="mt-2 text-sm text-muted">{tripQuery.error.message}</Text>
        ) : null}
      </ScreenContainer>
    );
  }

  // A partir daqui, `trip` está garantidamente preenchido.
  const tripRecord = trip as typeof trip & {
    clientName?: string | null;
    travelerName?: string | null;
    advanceAmount?: string;
    notes?: string | null;
    advanceConfirmedAt?: string | null;
    advanceConfirmedAmount?: string | null;
    hotelNote?: string | null;
    requiresFleetVehicle?: boolean;
    hasAdvance?: boolean;
    needsHotel?: boolean;
    flightDetails?: {
      passengerName?: string;
      passengerDocument?: string;
      passengerBirthDate?: string;
      airline?: string;
      flightNumber?: string;
      departureAirport?: string;
      arrivalAirport?: string;
    } | null;
  };
  const clientLabel = tripRecord.clientName ?? tripRecord.travelerName ?? "—";
  const advanceValue = tripRecord.advanceAmount ?? "0";
  const flightDetails = tripRecord.flightDetails ?? undefined;

  // --- Pendências para liberação da viagem ---
  const vehicleAllocated = Boolean(reservation?.vehicleId);
  const vehiclePending = Boolean(tripRecord.requiresFleetVehicle) && !vehicleAllocated;
  const advancePending = Boolean(tripRecord.hasAdvance) && !tripRecord.advanceConfirmedAt;
  const depositAmountValue = depositAmountDraft ?? advanceValue;
  const hotelNoteValue = hotelNoteDraft ?? tripRecord.hotelNote ?? "";
  const hotelPending = Boolean(tripRecord.needsHotel) && hotelNoteValue.trim() === "";
  const showPendenciesBlock = isAdmin && (
    tripRecord.requiresFleetVehicle || tripRecord.hasAdvance || tripRecord.needsHotel
  );

  const statusIndex = STATUS_ORDER.indexOf(trip.status as (typeof STATUS_ORDER)[number]);
  const isApprovedOrLater = statusIndex >= STATUS_ORDER.indexOf("Aprovada");
  const isReleasedOrLater = statusIndex >= STATUS_ORDER.indexOf("Liberada para viagem");
  const isFinishedStatus = statusIndex >= STATUS_ORDER.indexOf("Finalizada");

  const allocateVehicle = (vehicleId: number) => {
    if (reservation) {
      updateReservationMutation.mutate({ id: reservation.id, vehicleId, status: "Reservada" });
    } else {
      createReservationMutation.mutate({
        tripId: trip.id,
        vehicleId,
        driverId: trip.travelerId,
        status: "Reservada",
        plannedStartOn: trip.startsOn,
        plannedEndOn: trip.endsOn,
      });
    }
    setShowVehiclePicker(false);
  };

  const changeTransportMode = (mode: "Veículo próprio" | "Ônibus") => {
    updateTransportMutation.mutate({ id: trip.id, transport: mode, requiresFleetVehicle: false });
  };

  const confirmAdvance = () => {
    const normalized = depositAmountValue.trim().replace(",", ".");
    if (!normalized || Number.isNaN(Number(normalized))) {
      Alert.alert("Informe um valor válido", "Digite o valor efetivamente depositado antes de confirmar.");
      return;
    }
    confirmAdvanceMutation.mutate({ id: trip.id, depositedAmount: normalized });
  };

  const saveHotelNote = () => {
    updateHotelNoteMutation.mutate({ id: trip.id, hotelNote: hotelNoteValue.trim() || null });
  };

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
                  {trip.startsOn} — {trip.endsOn} · {clientLabel}
              </Text>
            </View>
            <StatusPill
              status={
                finished ? "Finalizada" : started ? "Em prestação" : trip.status
              }
            />
          </View>
          {tripRecord.notes ? (
            <View className="mt-5 rounded-2xl border border-border bg-surface p-5">
              <Text className="text-lg font-bold text-foreground">{t('Observações')}</Text>
              <Text className="mt-3 text-sm leading-6 text-foreground">{tripRecord.notes}</Text>
            </View>
          ) : null}
          {flightDetails ? (
            <View className="mt-5 rounded-2xl border border-border bg-surface p-5">
              <Text className="text-lg font-bold text-foreground">{t('Dados do voo')}</Text>
              <View className="mt-3 gap-2">
                <Text className="text-sm text-muted">{t('Passageiro')}: <Text className="font-semibold text-foreground">{flightDetails.passengerName || t('Não informado')}</Text></Text>
                <Text className="text-sm text-muted">{t('Documento / Passaporte')}: <Text className="font-semibold text-foreground">{flightDetails.passengerDocument || t('Não informado')}</Text></Text>
                <Text className="text-sm text-muted">{t('Companhia aérea')}: <Text className="font-semibold text-foreground">{flightDetails.airline || t('Não informado')}</Text></Text>
                <Text className="text-sm text-muted">{t('Voo')}: <Text className="font-semibold text-foreground">{flightDetails.flightNumber || t('Não informado')}</Text></Text>
                <Text className="text-sm text-muted">{t('Trecho')}: <Text className="font-semibold text-foreground">{flightDetails.departureAirport || '—'} → {flightDetails.arrivalAirport || '—'}</Text></Text>
              </View>
              <ReportExportActions
                title={t('Dados do voo')}
                filename={`viagem-${trip.id}-voo`}
                columns={[{ key: 'campo', label: t('Campo') }, { key: 'valor', label: t('Valor') }]}
                rows={[
                  { campo: t('Passageiro'), valor: flightDetails.passengerName || t('Não informado') },
                  { campo: t('Documento / Passaporte'), valor: flightDetails.passengerDocument || t('Não informado') },
                  { campo: t('Data de nascimento'), valor: flightDetails.passengerBirthDate || t('Não informado') },
                  { campo: t('Companhia aérea'), valor: flightDetails.airline || t('Não informado') },
                  { campo: t('Voo'), valor: flightDetails.flightNumber || t('Não informado') },
                  { campo: t('Trecho'), valor: `${flightDetails.departureAirport || '—'} → ${flightDetails.arrivalAirport || '—'}` },
                ]}
              />
            </View>
          ) : null}
          <View className="mt-6 flex-row gap-3">
            <View className="flex-1 rounded-2xl border border-border bg-surface p-4">
              <Text className="text-xs text-muted">Adiantamento</Text>
              <Text className="mt-2 text-lg font-bold text-foreground">
                {formatCurrency(Number(advanceValue))}
              </Text>
            </View>
            <View className="flex-1 rounded-2xl border border-border bg-surface p-4">
              <Text className="text-xs text-muted">Despesas lançadas</Text>
              <Text className="mt-2 text-lg font-bold text-primary">
                {formatCurrency(spent)}
              </Text>
            </View>
          </View>

          {showPendenciesBlock ? (
            <>
              <SectionHeader title="Pendências para liberação" />
              <View className="rounded-2xl border border-border bg-surface p-5 gap-5">
                {tripRecord.requiresFleetVehicle ? (
                  <View>
                    <View className="flex-row items-center justify-between">
                      <Text className="font-bold text-foreground">🚗 Veículo da frota</Text>
                      <Text className={vehiclePending ? "text-xs font-bold text-warning" : "text-xs font-bold text-success"}>
                        {vehiclePending ? "PENDENTE" : "CONFIRMADO"}
                      </Text>
                    </View>
                    {vehicleAllocated ? (
                      <Text className="mt-1 text-sm text-muted">
                        {reservation?.vehicleBrand} {reservation?.vehicleModel} · {reservation?.vehiclePlate}
                      </Text>
                    ) : (
                      <View className="mt-3 gap-2">
                        <PrimaryButton
                          label={showVehiclePicker ? "Ocultar veículos disponíveis" : "Alocar veículo"}
                          onPress={() => setShowVehiclePicker((current) => !current)}
                        />
                        {showVehiclePicker ? (
                          <View className="gap-2">
                            {availableVehiclesQuery.isLoading ? (
                              <Text className="text-sm text-muted">Carregando veículos disponíveis...</Text>
                            ) : availableVehiclesQuery.data?.items.length ? (
                              availableVehiclesQuery.data.items.map((item) => (
                                <Pressable
                                  key={item.id}
                                  onPress={() => allocateVehicle(item.id)}
                                  className="rounded-xl border border-border bg-background px-4 py-3"
                                >
                                  <Text className="font-semibold text-foreground">{item.brand} {item.model}</Text>
                                  <Text className="text-xs text-muted">{item.plate}</Text>
                                </Pressable>
                              ))
                            ) : (
                              <Text className="text-sm text-muted">Nenhum veículo disponível no momento.</Text>
                            )}
                          </View>
                        ) : null}
                        <View className="flex-row gap-2">
                          <Pressable
                            onPress={() => changeTransportMode("Veículo próprio")}
                            className="flex-1 rounded-xl border border-border px-3 py-2"
                          >
                            <Text className="text-center text-xs font-bold text-primary">Alterar para Veículo Próprio</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => changeTransportMode("Ônibus")}
                            className="flex-1 rounded-xl border border-border px-3 py-2"
                          >
                            <Text className="text-center text-xs font-bold text-primary">Alterar para Ônibus</Text>
                          </Pressable>
                        </View>
                      </View>
                    )}
                  </View>
                ) : null}

                {tripRecord.hasAdvance ? (
                  <View className="border-t border-border pt-5">
                    <View className="flex-row items-center justify-between">
                      <Text className="font-bold text-foreground">💰 Adiantamento</Text>
                      <Text className={advancePending ? "text-xs font-bold text-warning" : "text-xs font-bold text-success"}>
                        {advancePending ? "PENDENTE" : "CONFIRMADO"}
                      </Text>
                    </View>
                    {advancePending ? (
                      <View className="mt-3 gap-2">
                        <Text className="text-xs text-muted">Valor efetivamente depositado</Text>
                        <TextInput
                          value={depositAmountValue}
                          onChangeText={setDepositAmountDraft}
                          keyboardType="decimal-pad"
                          placeholder="Ex.: 1000000.00"
                          placeholderTextColor={colors.muted}
                          className="rounded-xl border border-border bg-background px-4 py-3 text-foreground"
                        />
                        <PrimaryButton label="Confirmar depósito realizado" onPress={confirmAdvance} />
                      </View>
                    ) : (
                      <Text className="mt-1 text-sm text-muted">
                        {formatCurrency(Number(tripRecord.advanceConfirmedAmount ?? advanceValue))} depositado em {new Date(tripRecord.advanceConfirmedAt as string).toLocaleString("pt-BR")}.
                      </Text>
                    )}
                  </View>
                ) : null}

                {tripRecord.needsHotel ? (
                  <View className="border-t border-border pt-5">
                    <View className="flex-row items-center justify-between">
                      <Text className="font-bold text-foreground">🏨 Hotel</Text>
                      <Text className={hotelPending ? "text-xs font-bold text-warning" : "text-xs font-bold text-success"}>
                        {hotelPending ? "PENDENTE" : "CONFIRMADO"}
                      </Text>
                    </View>
                    <View className="mt-3 gap-2">
                      <TextInput
                        value={hotelNoteValue}
                        onChangeText={setHotelNoteDraft}
                        multiline
                        placeholder="Cole aqui os dados da reserva de hotel..."
                        placeholderTextColor={colors.muted}
                        className="min-h-[80px] rounded-xl border border-border bg-background px-4 py-3 text-foreground"
                      />
                      <PrimaryButton label="Salvar dados do hotel" onPress={saveHotelNote} />
                    </View>
                  </View>
                ) : null}
              </View>
            </>
          ) : null}

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
                  {vehicleAllocated
                    ? `${reservation?.vehicleBrand} ${reservation?.vehicleModel}`
                    : "Veículo não associado"}
                </Text>
                <Text className="mt-1 text-sm text-muted">
                  {vehicleAllocated
                    ? `${reservation?.vehiclePlate} · Condutor: ${reservation?.driverName}`
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
              detail="Registrada pelo viajante"
              done
            />
            <TimelineItem
              title="Aprovada"
              detail={isApprovedOrLater ? "Concluída" : "Aguardando aprovação"}
              done={isApprovedOrLater}
            />
            <TimelineItem
              title="Liberada para viagem"
              detail={isReleasedOrLater ? "Concluída" : "Aguardando pendências"}
              done={isReleasedOrLater}
            />
            <TimelineItem
              title="Prestação de contas"
              detail={finished || isFinishedStatus ? "Finalizada" : "Em andamento"}
              done={finished || isFinishedStatus}
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

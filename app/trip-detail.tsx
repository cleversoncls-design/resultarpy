import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { PrimaryButton, SectionHeader, StatusPill } from "@/components/app-ui";
import {
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

  // Despesas reais lançadas para esta viagem (antes calculávamos isso a
  // partir de uma lista de demonstração vazia, que nunca refletia o valor
  // real lançado).
  const tripExpensesQuery = trpc.operations.expenses.list.useQuery(
    { tripId: tripId as number, page: 1, pageSize: 200 },
    { enabled: isAuthenticated && tripId !== undefined },
  );

  const recordKmMutation = trpc.operations.fleet.reservations.recordKm.useMutation({
    onSuccess: () => { reservationQuery.refetch(); },
  });
  // Registro de eventos (multa/avaria/outro) durante o uso do veículo —
  // antes, o botão de anexar foto era só um texto de exemplo (nunca
  // abria nada de verdade), e o evento em si nunca era enviado ao
  // servidor mesmo quando o formulário era preenchido.
  const createFleetEventMutation = trpc.operations.fleet.events.create.useMutation();
  // Eventos ja registrados nesta viagem (multas, avarias etc.) — antes
  // nao existia lugar nenhum para ve-los depois de criados, nem para o
  // proprio viajante nem para o Administrativo.
  const eventsQuery = trpc.operations.fleet.events.list.useQuery(
    { reservationId: reservation?.id as number, page: 1, pageSize: 20, direction: 'desc' },
    { enabled: isAuthenticated && Boolean(reservation?.id) },
  );
  const fleetEvents = eventsQuery.data?.items ?? [];
  const [viewingEventPhoto, setViewingEventPhoto] = useState<string | null>(null);
  const [eventType, setEventType] = useState<'Multa' | 'Avaria' | 'Outro'>('Outro');
  // Permite anexar mais de uma foto por evento -- antes so aceitava uma
  // (e nem tinha como remover uma foto escolhida por engano).
  const [eventPhotos, setEventPhotos] = useState<{ uri: string; name: string }[]>([]);
  const [eventPhotoError, setEventPhotoError] = useState<string | null>(null);
  const [eventError, setEventError] = useState<string | null>(null);
  const [eventSuccess, setEventSuccess] = useState<string | null>(null);
  const [tripActionError, setTripActionError] = useState<string | null>(null);
  const [tripActionSuccess, setTripActionSuccess] = useState<string | null>(null);
  const MAX_EVENT_PHOTOS = 6;
  const pickEventPhoto = () => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      setEventPhotoError(t('Este recurso está disponível apenas na versão web por enquanto.'));
      return;
    }
    if (eventPhotos.length >= MAX_EVENT_PHOTOS) {
      setEventPhotoError(t('Máximo de 6 fotos por evento.'));
      return;
    }
    setEventPhotoError(null);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = () => {
      const files = Array.from(input.files ?? []).slice(0, MAX_EVENT_PHOTOS - eventPhotos.length);
      files.forEach((file) => {
        if (file.size > 4 * 1024 * 1024) {
          setEventPhotoError(t('Arquivo muito grande. Escolha uma foto de até 4MB.'));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            setEventPhotos((current) => current.length >= MAX_EVENT_PHOTOS ? current : [...current, { uri: reader.result as string, name: file.name }]);
          }
        };
        reader.onerror = () => setEventPhotoError(t('Não foi possível ler o arquivo selecionado.'));
        reader.readAsDataURL(file);
      });
    };
    input.click();
  };
  const removeEventPhoto = (uri: string) => setEventPhotos((current) => current.filter((photo) => photo.uri !== uri));

  // Marca a viagem como "Em prestação" — funciona mesmo sem veículo da
  // frota (Veículo Próprio/Ônibus), diferente do recordKm acima que só
  // existe quando há uma reserva de frota associada.
  const startTripMutation = trpc.operations.trips.startTrip.useMutation({
    onSuccess: () => { tripQuery.refetch(); },
  });

  // O viajante envia o fechamento direto daqui — antes só existia dentro
  // da tela de despesas, o que era menos natural e dependia do tripId
  // chegar certinho por parâmetro de URL.
  const submitClosureMutation = trpc.operations.trips.submitClosure.useMutation({
    onSuccess: () => { tripQuery.refetch(); },
  });

  // Fluxo de fechamento: validação de comprovantes e faturamento, feitos
  // pelo Administrativo depois que o viajante envia a prestação de contas.
  const validateReceiptsMutation = trpc.operations.trips.validateReceipts.useMutation({
    onSuccess: () => { tripQuery.refetch(); },
  });
  const billTripMutation = trpc.operations.trips.billTrip.useMutation({
    onSuccess: () => { tripQuery.refetch(); },
  });

  const confirmAdvanceMutation = trpc.operations.trips.confirmAdvance.useMutation({
    onSuccess: () => { tripQuery.refetch(); },
  });
  const updateHotelNoteMutation = trpc.operations.trips.updateHotelNote.useMutation({
    onSuccess: () => { tripQuery.refetch(); },
  });
  const updateTransportMutation = trpc.operations.trips.update.useMutation({
    onSuccess: () => { tripQuery.refetch(); },
  });
  const createReservationMutation = trpc.operations.fleet.reservations.create.useMutation({
    onSuccess: () => { tripQuery.refetch(); reservationQuery.refetch(); },
  });
  const updateReservationMutation = trpc.operations.fleet.reservations.update.useMutation({
    onSuccess: () => { tripQuery.refetch(); reservationQuery.refetch(); },
  });

  // Todos os hooks abaixo são sempre chamados, em toda renderização,
  // independentemente de a viagem já ter chegado ou não (regra do React).
  const tripExpenses = tripExpensesQuery.data?.items ?? [];
  const spent = tripExpenses.reduce(
    (sum, expense) => sum + Number(expense.quantity) * Number(expense.unitValue),
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
  const [editingHotel, setEditingHotel] = useState(false);
  const [depositAmountDraft, setDepositAmountDraft] = useState<string | null>(null);

  // Sempre que o usuário navega para outra viagem (tripId muda), sem que a
  // tela seja desmontada, limpamos os rascunhos locais — senão o valor
  // digitado numa viagem (ex.: valor do depósito) "vaza" para a próxima.
  useEffect(() => {
    setShowVehiclePicker(false);
    setHotelNoteDraft(null);
    setEditingHotel(false);
    setDepositAmountDraft(null);
    setStarted(false);
    setFinished(false);
    setDepartureKm("");
    setReturnKm("");
    setHasEvent(false);
    setEventNote("");
  }, [tripId]);

  // Assim que os dados da reserva chegam (ou mudam), refletimos o KM já
  // registrado no banco — antes isso só funcionava na primeira renderização.
  useEffect(() => {
    if (reservation?.departureKm) {
      setStarted(true);
      setDepartureKm(String(reservation.departureKm));
    }
    if (reservation?.returnKm) {
      setFinished(true);
      setReturnKm(String(reservation.returnKm));
    }
  }, [reservation?.departureKm, reservation?.returnKm]);

  // Só a partir daqui decidimos o que renderizar.
  if (!tripId) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]} className="px-5 pt-4">
        <Pressable onPress={() => router.back()} className="mb-5">
          <Text className="font-semibold text-primary">‹ Voltar</Text>
        </Pressable>
        <Text className="text-foreground">{t('Nenhuma viagem informada para exibir.')}</Text>
      </ScreenContainer>
    );
  }

  if (tripQuery.isLoading) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]} className="px-5 pt-4">
        <Text className="text-foreground">{t('Carregando viagem...')}</Text>
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
    closureSubmittedAt?: string | null;
    receiptsValidatedAt?: string | null;
    billedAt?: string | null;
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

  // Alert.alert() não funciona na web — as confirmações abaixo eram
  // silenciosamente ignoradas ali; agora usam o mesmo aviso inline que
  // já usamos no resto da tela.
  const startTrip = () => {
    setTripActionError(null);
    setTripActionSuccess(null);
    const hasVehicle = Boolean(reservation?.id);
    const km = parseKm(departureKm);
    if (hasVehicle && !km) {
      setTripActionError(t('Digite a quilometragem de saída antes de iniciar a viagem.'));
      return;
    }
    setStarted(true);
    if (hasVehicle && reservation?.id) {
      recordKmMutation.mutate({ reservationId: reservation.id, departureKm: km });
    }
    startTripMutation.mutate({ id: trip.id });
    setTripActionSuccess(hasVehicle ? `${t('Saída registrada em')} ${km.toLocaleString("pt-BR")} km.` : t('A viagem foi marcada como em andamento.'));
  };

  const finishTrip = () => {
    setTripActionError(null);
    setTripActionSuccess(null);
    const km = parseKm(returnKm);
    if (!km || km < parseKm(departureKm)) {
      setTripActionError(t('O KM de retorno deve ser maior ou igual ao KM de saída.'));
      return;
    }
    setFinished(true);
    if (reservation?.id) {
      recordKmMutation.mutate({ reservationId: reservation.id, returnKm: km });
    }
    setTripActionSuccess(`${t('Percurso registrado')}: ${(km - parseKm(departureKm)).toLocaleString("pt-BR")} km.`);
  };

  // Um evento (multa, avaria, outro) pode acontecer a qualquer momento
  // durante o uso do veiculo, nao so na hora de finalizar a viagem --
  // por isso salva na hora, independente de iniciar/finalizar, e o
  // formulario limpa depois para permitir registrar mais de um evento.
  const saveEvent = () => {
    setEventError(null);
    if (!eventNote.trim()) {
      setEventError(t('Descreva o evento antes de salvar.'));
      return;
    }
    if (!reservation?.id) return;
    createFleetEventMutation.mutate(
      { reservationId: reservation.id, eventType, description: eventNote.trim(), photoUris: eventPhotos.map((photo) => photo.uri) },
      {
        onSuccess: () => {
          setEventNote('');
          setEventPhotos([]);
          setEventType('Outro');
          setHasEvent(false);
          setEventSuccess(t('Evento registrado para avaliação do Administrativo.'));
          void eventsQuery.refetch();
        },
        onError: (error) => setEventError(error.message),
      },
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
              <Text className="text-xs text-muted">{t('Adiantamento')}</Text>
              <Text className="mt-2 text-lg font-bold text-foreground">
                {formatCurrency(Number(advanceValue))}
              </Text>
              {tripRecord.advanceConfirmedAt ? (
                <Text className="mt-1 text-xs text-success">
                  {formatCurrency(Number(tripRecord.advanceConfirmedAmount ?? advanceValue))} {t('depositado em')} {new Date(tripRecord.advanceConfirmedAt as string).toLocaleDateString("pt-BR")}
                </Text>
              ) : null}
            </View>
            <View className="flex-1 rounded-2xl border border-border bg-surface p-4">
              <Text className="text-xs text-muted">{t('Despesas lançadas')}</Text>
              <Text className="mt-2 text-lg font-bold text-primary">
                {formatCurrency(spent)}
              </Text>
            </View>
          </View>

          {showPendenciesBlock ? (
            <>
              <SectionHeader title={t('Pendências para liberação')} />
              <View className="rounded-2xl border border-border bg-surface p-5 gap-5">
                {tripRecord.requiresFleetVehicle ? (
                  <View>
                    <View className="flex-row items-center justify-between">
                      <Text className="font-bold text-foreground">🚗 {t('Veículo da frota')}</Text>
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
                          label={showVehiclePicker ? t("Ocultar veículos disponíveis") : t("Alocar veículo")}
                          onPress={createReservationMutation.isPending || updateReservationMutation.isPending ? undefined : () => setShowVehiclePicker((current) => !current)}
                        />
                        <MutationFeedback
                          isPending={createReservationMutation.isPending || updateReservationMutation.isPending}
                          isSuccess={createReservationMutation.isSuccess || updateReservationMutation.isSuccess}
                          isError={createReservationMutation.isError || updateReservationMutation.isError}
                          errorMessage={createReservationMutation.error?.message ?? updateReservationMutation.error?.message}
                          pendingLabel="Alocando veículo..."
                          successLabel="Veículo alocado."
                        />
                        {showVehiclePicker ? (
                          <View className="gap-2 rounded-xl border border-border overflow-hidden">
                            {availableVehiclesQuery.isLoading ? (
                              <Text className="p-4 text-sm text-muted">{t('Carregando veículos disponíveis...')}</Text>
                            ) : availableVehiclesQuery.data?.items.length ? (
                              availableVehiclesQuery.data.items.map((item, index) => (
                                <Pressable
                                  key={item.id}
                                  onPress={() => allocateVehicle(item.id)}
                                  style={({ pressed }) => ({
                                    opacity: pressed ? 0.6 : 1,
                                    backgroundColor: pressed ? colors.background : colors.surface,
                                  })}
                                  className={`flex-row items-center justify-between px-4 py-3 ${index > 0 ? "border-t border-border" : ""}`}
                                >
                                  <View className="flex-row items-center flex-1">
                                    <View
                                      style={{ backgroundColor: `${colors.primary}18` }}
                                      className="h-10 w-10 items-center justify-center rounded-xl"
                                    >
                                      <IconSymbol name="car.fill" size={18} color={colors.primary} />
                                    </View>
                                    <View className="ml-3">
                                      <Text className="font-semibold text-foreground">{item.brand} {item.model}</Text>
                                      <Text className="text-xs text-muted">{item.plate}</Text>
                                    </View>
                                  </View>
                                  <View
                                    style={{ backgroundColor: colors.primary }}
                                    className="rounded-lg px-3 py-2"
                                  >
                                    <Text className="text-xs font-bold text-white">{t('Selecionar')}</Text>
                                  </View>
                                </Pressable>
                              ))
                            ) : (
                              <Text className="p-4 text-sm text-muted">{t('Nenhum veículo disponível no momento.')}</Text>
                            )}
                          </View>
                        ) : null}
                        <View className="flex-row gap-2">
                          <Pressable
                            onPress={updateTransportMutation.isPending ? undefined : () => changeTransportMode("Veículo próprio")}
                            className="flex-1 rounded-xl border border-border px-3 py-2"
                          >
                            <Text className="text-center text-xs font-bold text-primary">{t('Alterar para Veículo Próprio')}</Text>
                          </Pressable>
                          <Pressable
                            onPress={updateTransportMutation.isPending ? undefined : () => changeTransportMode("Ônibus")}
                            className="flex-1 rounded-xl border border-border px-3 py-2"
                          >
                            <Text className="text-center text-xs font-bold text-primary">{t('Alterar para Ônibus')}</Text>
                          </Pressable>
                        </View>
                        <MutationFeedback
                          isPending={updateTransportMutation.isPending}
                          isSuccess={updateTransportMutation.isSuccess}
                          isError={updateTransportMutation.isError}
                          errorMessage={updateTransportMutation.error?.message}
                          pendingLabel="Alterando modalidade..."
                          successLabel="Modalidade alterada."
                        />
                      </View>
                    )}
                  </View>
                ) : null}

                {tripRecord.hasAdvance ? (
                  <View className="border-t border-border pt-5">
                    <View className="flex-row items-center justify-between">
                      <Text className="font-bold text-foreground">💰 {t('Adiantamento')}</Text>
                      <Text className={advancePending ? "text-xs font-bold text-warning" : "text-xs font-bold text-success"}>
                        {advancePending ? "PENDENTE" : "CONFIRMADO"}
                      </Text>
                    </View>
                    {advancePending ? (
                      <View className="mt-3 gap-2">
                        <Text className="text-xs text-muted">{t('Valor efetivamente depositado')}</Text>
                        <TextInput
                          value={depositAmountValue}
                          onChangeText={setDepositAmountDraft}
                          keyboardType="decimal-pad"
                          placeholder={t('Ex.: 1000000.00')}
                          placeholderTextColor={colors.muted}
                          className="rounded-xl border border-border bg-background px-4 py-3 text-foreground"
                        />
                        <PrimaryButton
                          label={confirmAdvanceMutation.isPending ? t("Confirmando...") : t("Confirmar depósito realizado")}
                          onPress={confirmAdvanceMutation.isPending ? undefined : confirmAdvance}
                        />
                        <MutationFeedback
                          isPending={confirmAdvanceMutation.isPending}
                          isSuccess={confirmAdvanceMutation.isSuccess}
                          isError={confirmAdvanceMutation.isError}
                          errorMessage={confirmAdvanceMutation.error?.message}
                          pendingLabel="Confirmando depósito..."
                          successLabel="Depósito confirmado."
                        />
                      </View>
                    ) : (
                      <Text className="mt-1 text-sm text-muted">
                        {formatCurrency(Number(tripRecord.advanceConfirmedAmount ?? advanceValue))} {t('depositado em')} {new Date(tripRecord.advanceConfirmedAt as string).toLocaleString("pt-BR")}.
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
                    {hotelPending || editingHotel ? (
                      <View className="mt-3 gap-2">
                        <TextInput
                          value={hotelNoteValue}
                          onChangeText={setHotelNoteDraft}
                          multiline
                          placeholder={t('Cole aqui os dados da reserva de hotel...')}
                          placeholderTextColor={colors.muted}
                          className="min-h-[80px] rounded-xl border border-border bg-background px-4 py-3 text-foreground"
                        />
                        <PrimaryButton
                          label={updateHotelNoteMutation.isPending ? t("Salvando...") : t("Salvar dados do hotel")}
                          onPress={updateHotelNoteMutation.isPending ? undefined : () => { saveHotelNote(); setEditingHotel(false); }}
                        />
                        <MutationFeedback
                          isPending={updateHotelNoteMutation.isPending}
                          isSuccess={updateHotelNoteMutation.isSuccess}
                          isError={updateHotelNoteMutation.isError}
                          errorMessage={updateHotelNoteMutation.error?.message}
                          pendingLabel="Salvando dados do hotel..."
                          successLabel="Dados do hotel salvos."
                        />
                      </View>
                    ) : (
                      <View className="mt-3 gap-2">
                        <Text className="text-sm text-muted">{hotelNoteValue}</Text>
                        <Pressable onPress={() => setEditingHotel(true)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                          <Text className="text-xs font-bold text-primary">{t('Editar')}</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                ) : null}
              </View>
            </>
          ) : null}

          {isAdmin && tripRecord.closureSubmittedAt ? (
            <>
              <SectionHeader title={t('Fechamento da prestação de contas')} />
              <View className="rounded-2xl border border-border bg-surface p-5 gap-5">
                <View>
                  <View className="flex-row items-center justify-between">
                    <Text className="font-bold text-foreground">📥 {t('Prestação enviada')}</Text>
                    <Text className="text-xs font-bold text-success">CONFIRMADO</Text>
                  </View>
                  <Text className="mt-1 text-sm text-muted">
                    {t('Enviada pelo viajante em')} {new Date(tripRecord.closureSubmittedAt as string).toLocaleString("pt-BR")}.
                  </Text>
                </View>

                <View className="border-t border-border pt-5">
                  <View className="flex-row items-center justify-between">
                    <Text className="font-bold text-foreground">🧾 {t('Validação dos comprovantes')}</Text>
                    <Text className={tripRecord.receiptsValidatedAt ? "text-xs font-bold text-success" : "text-xs font-bold text-warning"}>
                      {tripRecord.receiptsValidatedAt ? "CONFIRMADO" : "PENDENTE"}
                    </Text>
                  </View>
                  {tripRecord.receiptsValidatedAt ? (
                    <Text className="mt-1 text-sm text-muted">
                      {t('Validado em')} {new Date(tripRecord.receiptsValidatedAt as string).toLocaleString("pt-BR")}.
                    </Text>
                  ) : (
                    <View className="mt-3">
                      <PrimaryButton
                        label={validateReceiptsMutation.isPending ? t("Validando...") : t("Validar comprovantes")}
                        onPress={validateReceiptsMutation.isPending ? undefined : () => validateReceiptsMutation.mutate({ id: trip.id })}
                      />
                      <MutationFeedback
                        isPending={validateReceiptsMutation.isPending}
                        isSuccess={validateReceiptsMutation.isSuccess}
                        isError={validateReceiptsMutation.isError}
                        errorMessage={validateReceiptsMutation.error?.message}
                        pendingLabel="Validando comprovantes..."
                        successLabel="Comprovantes validados."
                      />
                    </View>
                  )}
                </View>

                <View className="border-t border-border pt-5">
                  <View className="flex-row items-center justify-between">
                    <Text className="font-bold text-foreground">💳 {t('Faturamento ao cliente')}</Text>
                    <Text className={tripRecord.billedAt ? "text-xs font-bold text-success" : "text-xs font-bold text-warning"}>
                      {tripRecord.billedAt ? "CONFIRMADO" : "PENDENTE"}
                    </Text>
                  </View>
                  {tripRecord.billedAt ? (
                    <Text className="mt-1 text-sm text-muted">
                      {t('Faturado em')} {new Date(tripRecord.billedAt as string).toLocaleString("pt-BR")}. {t('Viagem finalizada.')}
                    </Text>
                  ) : !tripRecord.receiptsValidatedAt ? (
                    <Text className="mt-1 text-sm text-muted">{t('Valide os comprovantes antes de faturar.')}</Text>
                  ) : (
                    <View className="mt-3">
                      <PrimaryButton
                        label={billTripMutation.isPending ? t("Faturando...") : t("Faturar gastos")}
                        onPress={billTripMutation.isPending ? undefined : () => billTripMutation.mutate({ id: trip.id })}
                      />
                      <MutationFeedback
                        isPending={billTripMutation.isPending}
                        isSuccess={billTripMutation.isSuccess}
                        isError={billTripMutation.isError}
                        errorMessage={billTripMutation.error?.message}
                        pendingLabel="Faturando..."
                        successLabel="Gastos faturados. Viagem finalizada."
                      />
                    </View>
                  )}
                </View>
              </View>
            </>
          ) : null}

          <SectionHeader title={t('Controle da viagem de frota')} />
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
                    : t("Veículo não associado")}
                </Text>
                <Text className="mt-1 text-sm text-muted">
                  {vehicleAllocated
                    ? `${reservation?.vehiclePlate} · ${t('Condutor')}: ${reservation?.driverName}`
                    : t("Solicitação enviada ao Administrativo")}
                </Text>
              </View>
            </View>
            <View className="mt-5 gap-3">
              <Text className="text-xs font-bold uppercase tracking-widest text-muted">
                {t('KM do veículo')}
              </Text>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="mb-2 text-xs text-muted">{t('Saída')}</Text>
                  <TextInput
                    value={departureKm}
                    onChangeText={setDepartureKm}
                    editable={!started}
                    keyboardType="numeric"
                    placeholder={t('Ex.: 74101')}
                    placeholderTextColor={colors.muted}
                    className="rounded-xl border border-border bg-background px-4 py-3 text-foreground"
                  />
                </View>
                <View className="flex-1">
                  <Text className="mb-2 text-xs text-muted">{t('Retorno')}</Text>
                  <TextInput
                    value={returnKm}
                    onChangeText={setReturnKm}
                    editable={started && !finished}
                    keyboardType="numeric"
                    placeholder={t('Ex.: 74820')}
                    placeholderTextColor={colors.muted}
                    className="rounded-xl border border-border bg-background px-4 py-3 text-foreground"
                  />
                </View>
              </View>
              {!isAdmin ? (
                !started ? (
                  <PrimaryButton label={t('Iniciar viagem')} onPress={startTrip} />
                ) : !finished ? (
                  <PrimaryButton label={t('Finalizar viagem')} onPress={finishTrip} />
                ) : (
                  <View
                    style={{ backgroundColor: `${colors.success}18` }}
                    className="rounded-xl p-3"
                  >
                    <Text className="font-semibold text-success">
                      {t('Viagem finalizada e quilometragem registrada.')}
                    </Text>
                  </View>
                )
              ) : null}
              {tripActionError ? <Text style={{ color: colors.error }} className="mt-3 text-sm font-semibold">{tripActionError}</Text> : null}
              {tripActionSuccess ? <Text style={{ color: colors.success }} className="mt-3 text-sm font-semibold">{tripActionSuccess}</Text> : null}
            </View>
            <View className="mt-6 border-t border-border pt-5">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="font-bold text-foreground">
                    {t('Registro de eventos')}
                  </Text>
                  <Text className="mt-1 text-xs text-muted">
                    {t('Multas, avarias ou outros acontecimentos')}
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
                  <View className="flex-row gap-2">
                    {(['Multa', 'Avaria', 'Outro'] as const).map((option) => (
                      <Pressable
                        key={option}
                        onPress={() => setEventType(option)}
                        style={({ pressed }) => ({
                          flex: 1,
                          borderColor: eventType === option ? colors.warning : colors.border,
                          backgroundColor: eventType === option ? `${colors.warning}14` : colors.surface,
                          opacity: pressed ? 0.72 : 1,
                        })}
                        className="rounded-xl border p-2"
                      >
                        <Text style={{ color: eventType === option ? colors.warning : colors.foreground }} className="text-center text-xs font-bold">{t(option)}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <TextInput
                    value={eventNote}
                    onChangeText={setEventNote}
                    multiline
                    placeholder={t('Descreva a multa, avaria ou outro evento...')}
                    placeholderTextColor={colors.muted}
                    className="min-h-[90px] rounded-xl border border-border bg-background px-4 py-3 text-foreground"
                  />
                  <Pressable
                    onPress={pickEventPhoto}
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
                      name={eventPhotos.length ? "checkmark.circle.fill" : "camera.fill"}
                      size={18}
                      color={eventPhotos.length ? colors.success : colors.primary}
                    />
                    <Text className="ml-2 font-bold text-primary">
                      {eventPhotos.length ? `${eventPhotos.length} ${t('foto(s) selecionada(s)')} — ${t('toque para adicionar mais')}` : t('Anexar fotos da avaria')}
                    </Text>
                  </Pressable>
                  {eventPhotos.length ? (
                    <View className="flex-row flex-wrap gap-2">
                      {eventPhotos.map((photo) => (
                        <View key={photo.uri} style={{ width: 84, height: 84 }}>
                          <Image source={{ uri: photo.uri }} style={{ width: 84, height: 84, borderRadius: 10 }} resizeMode="cover" />
                          <Pressable
                            onPress={() => removeEventPhoto(photo.uri)}
                            style={{ position: 'absolute', top: -6, right: -6, backgroundColor: colors.error, borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>×</Text>
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  {eventPhotoError ? <Text style={{ color: colors.error }} className="text-xs font-semibold">{eventPhotoError}</Text> : null}
                  {eventError ? <Text style={{ color: colors.error }} className="text-xs font-semibold">{eventError}</Text> : null}
                  <Pressable
                    onPress={saveEvent}
                    disabled={createFleetEventMutation.isPending}
                    style={({ pressed }) => ({
                      backgroundColor: colors.warning,
                      borderRadius: 12,
                      minHeight: 46,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: pressed || createFleetEventMutation.isPending ? 0.75 : 1,
                    })}
                  >
                    <Text className="font-bold text-white">{createFleetEventMutation.isPending ? t('Salvando...') : t('Salvar evento')}</Text>
                  </Pressable>
                </View>
              ) : null}
              {eventSuccess ? <Text style={{ color: colors.success }} className="mt-3 text-sm font-semibold">{eventSuccess}</Text> : null}
            </View>
          </View>

          {fleetEvents.length > 0 ? (
            <>
              <SectionHeader title={t('Eventos registrados')} />
              <View className="mb-2 gap-3">
                {fleetEvents.map((event) => (
                  <View key={event.id} className="rounded-2xl border border-border bg-surface p-4">
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 pr-3">
                        <View style={{ backgroundColor: `${colors.warning}18` }} className="mb-2 self-start rounded-full px-2 py-0.5">
                          <Text style={{ color: colors.warning }} className="text-[10px] font-bold uppercase">{t(event.eventType)}</Text>
                        </View>
                        <Text className="text-sm text-foreground">{event.description}</Text>
                        <Text className="mt-1 text-xs text-muted">{new Date(event.createdAt).toLocaleString('pt-BR')}</Text>
                      </View>
                    </View>
                    {(event as any).photos && (event as any).photos.length ? (
                      <View className="mt-3 flex-row flex-wrap gap-2">
                        {(event as any).photos.map((photoUri: string, index: number) => (
                          <Pressable key={`${event.id}-${index}`} onPress={() => setViewingEventPhoto(photoUri)}>
                            <Image source={{ uri: photoUri }} style={{ width: 56, height: 56, borderRadius: 10 }} resizeMode="cover" />
                          </Pressable>
                        ))}
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            </>
          ) : null}

          <SectionHeader title={t('Linha do tempo')} />
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
              detail={Boolean(tripRecord.closureSubmittedAt) ? "Concluída" : "Em andamento"}
              done={Boolean(tripRecord.closureSubmittedAt)}
            />
            <TimelineItem
              title="Validação dos comprovantes"
              detail={tripRecord.receiptsValidatedAt ? "Concluída" : "Aguardando envio/validação"}
              done={Boolean(tripRecord.receiptsValidatedAt)}
            />
            <TimelineItem
              title="Viagem finalizada"
              detail={tripRecord.billedAt ? "Faturada ao cliente" : "Aguardando faturamento"}
              done={Boolean(tripRecord.billedAt) || isFinishedStatus}
              last
            />
          </View>
          <SectionHeader
            title={t('Despesas')}
            action={`${tripExpenses.length} ${t('itens')}`}
          />
          {!isAdmin && !tripRecord.receiptsValidatedAt ? (
            <PrimaryButton
              label={t('Adicionar despesa')}
              onPress={() => router.push({ pathname: "/expenses", params: { tripId: String(trip.id) } })}
            />
          ) : (
            // O Administrativo não lança despesas, e o viajante perde a
            // opção de editar assim que os comprovantes são validados —
            // nos dois casos, usa a mesma tela de despesas em modo
            // só-leitura (com "Apagar" liberado apenas pro Administrativo).
            <PrimaryButton
              label={t('Ver despesas')}
              onPress={() => router.push({ pathname: "/expenses", params: { tripId: String(trip.id) } })}
            />
          )}

          {!isAdmin ? (
            <View className="mt-4">
              {tripRecord.closureSubmittedAt ? (
                <View style={{ backgroundColor: `${colors.success}18` }} className="rounded-xl p-3">
                  <Text style={{ color: colors.success }} className="text-sm font-semibold">
                    ✓ Fechamento enviado em {new Date(tripRecord.closureSubmittedAt as string).toLocaleString("pt-BR")}. Aguardando validação do Administrativo.
                  </Text>
                </View>
              ) : (
                <>
                  <PrimaryButton
                    label={submitClosureMutation.isPending ? t("Enviando...") : t("Enviar fechamento")}
                    onPress={submitClosureMutation.isPending ? undefined : () => submitClosureMutation.mutate({ id: trip.id })}
                  />
                  <MutationFeedback
                    isPending={submitClosureMutation.isPending}
                    isSuccess={submitClosureMutation.isSuccess}
                    isError={submitClosureMutation.isError}
                    errorMessage={submitClosureMutation.error?.message}
                    pendingLabel="Enviando fechamento..."
                    successLabel="Fechamento enviado ao Administrativo."
                  />
                </>
              )}
            </View>
          ) : null}
        </ScrollView>
      </View>
      <EventPhotoModal uri={viewingEventPhoto} onClose={() => setViewingEventPhoto(null)} />
    </ScreenContainer>
  );
}

function MutationFeedback({
  isPending,
  isSuccess,
  isError,
  errorMessage,
  pendingLabel,
  successLabel,
}: {
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  errorMessage?: string;
  pendingLabel: string;
  successLabel: string;
}) {
  const colors = useColors();
  const { t } = useLanguage();
  if (isPending) return <Text className="mt-2 text-xs font-semibold text-muted">{t(pendingLabel)}</Text>;
  if (isError) return <Text style={{ color: colors.error }} className="mt-2 text-xs font-semibold">{errorMessage ? errorMessage : t("Ocorreu um erro. Tente novamente.")}</Text>;
  if (isSuccess) return <Text style={{ color: colors.success }} className="mt-2 text-xs font-semibold">✓ {t(successLabel)}</Text>;
  return null;
}

function EventPhotoModal({ uri, onClose }: { uri: string | null; onClose: () => void }) {
  const colors = useColors();
  const { t } = useLanguage();
  if (!uri) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 items-center justify-center bg-black/70 px-5">
        <Pressable onPress={(event) => event.stopPropagation()} style={{ backgroundColor: colors.surface }} className="max-h-[85%] w-full max-w-2xl rounded-2xl p-4">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-base font-bold text-foreground">{t('Foto do evento')}</Text>
            <Pressable onPress={onClose} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}><Text className="text-2xl text-muted">×</Text></Pressable>
          </View>
          <Image source={{ uri }} style={{ width: '100%', height: 420, borderRadius: 12 }} resizeMode="contain" />
        </Pressable>
      </Pressable>
    </Modal>
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
  const { t } = useLanguage();
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
        <Text className="font-bold text-foreground">{t(title)}</Text>
        <Text className="mt-1 text-xs text-muted">{t(detail)}</Text>
      </View>
    </View>
  );
}

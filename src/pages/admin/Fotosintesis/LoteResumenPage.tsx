import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Radio, RadioGroup, FormControlLabel } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { getFoto, fontFamilies } from "../../../design-system";
import {
  useConvexMutation,
  useConvexQuery,
  convexApi,
} from "../../../lib/convex-safe";
import { useNotification } from "../../../contexts/NotificationContext";
import type { Id } from "../../../../convex/_generated/dataModel";
import { TicketHeader } from "./components/TicketHeader";
import { FieldLabel } from "./components/FieldLabel";
import { NumberInputWithCalc } from "./components/NumberInputWithCalc";

type PublishMode = "all" | "selective" | "reserve";

const formatCOP = (n: number): string =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);

function ValidationCard({
  label,
  ok,
  value,
  detail,
}: {
  label: string;
  ok: boolean;
  value: string;
  detail: string;
}) {
  const foto = getFoto("light");
  return (
    <Box
      role="status"
      aria-label={`${label}: ${ok ? "cumplido" : "pendiente"}`}
      sx={{
        background: foto.surfaces.panel,
        border: `1px solid ${ok ? foto.accent.soft : foto.surfaces.rule}`,
        borderLeft: `3px solid ${ok ? foto.accent.primary : foto.status.sold}`,
        borderRadius: "12px",
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <Box sx={{ fontSize: 11, fontWeight: 600, color: foto.ink.tertiary }}>
          {label}
        </Box>
        <Box
          sx={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: ok ? foto.accent.deep : foto.status.sold,
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          {ok ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
          {ok ? "OK" : "Revisar"}
        </Box>
      </Box>
      <Box
        sx={{
          fontSize: 22,
          fontWeight: 600,
          color: foto.ink.primary,
          fontFamily: fontFamilies.mono,
        }}
      >
        {value}
      </Box>
      <Box sx={{ fontSize: 11.5, color: foto.ink.secondary }}>{detail}</Box>
    </Box>
  );
}

export default function FotosintesisLoteResumenPage() {
  const foto = getFoto("light");
  const navigate = useNavigate();
  const { notify } = useNotification();
  const { loteId: loteIdParam } = useParams();
  const loteId = loteIdParam ?? "";

  const lot = useConvexQuery(
    convexApi.lots.getByLoteId,
    loteId ? { loteId } : "skip",
  );
  const lotItems = useConvexQuery(
    convexApi.lotItems.listByLote,
    loteId ? { loteId } : "skip",
  );
  const products = useConvexQuery(
    convexApi.products.listByLote,
    loteId ? { loteId } : "skip",
  );

  const closeLot = useConvexMutation(convexApi.lots.close);
  const publishLot = useConvexMutation(convexApi.lots.publish);
  const updateGemaFields = useConvexMutation(
    convexApi.lotItems.updateGemaFields,
  );

  const [pubByItemId, setPubByItemId] = useState<Record<string, boolean>>({});
  const [publishMode, setPublishMode] = useState<PublishMode>("selective");
  const [pricingByItemId, setPricingByItemId] = useState<
    Record<
      string,
      {
        precioEmbajadorCOP: number | "";
        precioPotencialCOP: number | "";
        precioConscienteCOP: number | "";
      }
    >
  >({});
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!lotItems || !products) return;
    const nextPub: Record<string, boolean> = {};
    const nextPricing: typeof pricingByItemId = {};
    for (const li of lotItems) {
      const p = products.find((row) => row.itemId === li.itemId);
      nextPub[li.itemId] = p?.mostrarEnCatalogo ?? false;
      nextPricing[li.itemId] = {
        precioEmbajadorCOP: p?.precioEmbajadorCOP ?? "",
        precioPotencialCOP: p?.precioPotencialCOP ?? "",
        precioConscienteCOP: p?.precioConscienteCOP ?? "",
      };
    }
    setPubByItemId(nextPub);
    setPricingByItemId(nextPricing);
  }, [lotItems, products]);

  const prepSum = useMemo(
    () => (lotItems ?? []).reduce((s, it) => s + it.preponderancia, 0),
    [lotItems],
  );
  const itemsCount = lotItems?.length ?? 0;
  const unidades = lot?.unidadesDeclaradas ?? 0;
  const br2Ok = Math.abs(prepSum - 100) <= 0.01;
  const br3Ok = itemsCount === unidades && unidades > 0;
  const photosOk = useMemo(() => {
    if (!products?.length) return false;
    return products.every((p) => Boolean(p.fotoUrl));
  }, [products]);
  const syncOk = lot?.syncStatus !== "error";

  const validationsOk = br2Ok && br3Ok && lot?.estado === "abierto";
  // A lot closed in selective/reserve mode lands here as `cerrado` with its
  // items still in reserva. Publishing is the post-close action that makes
  // them appear in the catalog (the `mostrarEnCatalogo` flag is what the
  // customer-facing `products.publishedCatalog` bridge reads).
  const isClosed = lot?.estado === "cerrado";

  useEffect(() => {
    if (!lot || !lotItems) return;
    // Already published — nothing left to do here, send back to the queue.
    if (lot.estado === "publicado" || lot.estado === "cancelado") {
      navigate("/admin/fotosintesis", { replace: true });
      return;
    }
    if (lot.estado !== "abierto") return;
    if (!validationsOk) {
      navigate(`/admin/fotosintesis/lots/${loteId}`, { replace: true });
    }
  }, [lot, lotItems, validationsOk, navigate, loteId]);

  const applyPublishMode = useCallback(
    (mode: PublishMode) => {
      setPublishMode(mode);
      if (!lotItems || mode === "selective") return;
      setPubByItemId((prev) => {
        const next = { ...prev };
        for (const li of lotItems) {
          next[li.itemId] = mode === "all";
        }
        return next;
      });
    },
    [lotItems],
  );

  const handleClose = async () => {
    if (!lot || !lotItems || !validationsOk) return;
    setClosing(true);
    try {
      for (const li of lotItems) {
        const pricing = pricingByItemId[li.itemId];
        await updateGemaFields({
          lotItemId: li._id as Id<"lotItems">,
          patch: {
            mostrarEnCatalogo: pubByItemId[li.itemId] ?? false,
            ...(typeof pricing?.precioEmbajadorCOP === "number"
              ? { precioEmbajadorCOP: pricing.precioEmbajadorCOP }
              : {}),
            ...(typeof pricing?.precioPotencialCOP === "number"
              ? { precioPotencialCOP: pricing.precioPotencialCOP }
              : {}),
            ...(typeof pricing?.precioConscienteCOP === "number"
              ? { precioConscienteCOP: pricing.precioConscienteCOP }
              : {}),
          },
        });
      }

      await closeLot({ id: lot._id as Id<"lots"> });

      if (publishMode === "all") {
        await publishLot({ id: lot._id as Id<"lots"> });
      }

      notify(
        `Lote ${lot.loteId} cerrado · ${itemsCount} ítems · sincronizando…`,
        "success",
      );
      navigate("/admin/fotosintesis");
    } catch (err) {
      notify(
        err instanceof Error ? err.message : "No pudimos cerrar el lote",
        "error",
      );
    } finally {
      setClosing(false);
    }
  };

  // Publish an already-closed lot: flips every item to mostrarEnCatalogo:true
  // and moves the lot to `publicado`, so its items surface in the catalog and
  // it leaves the "Lotes en curso" queue. This is the missing exit for lots
  // closed in selective/reserve mode (which never reached `publicado`).
  const handlePublishClosed = async () => {
    if (!lot || !isClosed) return;
    setClosing(true);
    try {
      await publishLot({ id: lot._id as Id<"lots"> });
      notify(
        `Lote ${lot.loteId} publicado · ${itemsCount} ítems en catálogo`,
        "success",
      );
      navigate("/admin/fotosintesis");
    } catch (err) {
      notify(
        err instanceof Error ? err.message : "No pudimos publicar el lote",
        "error",
      );
    } finally {
      setClosing(false);
    }
  };

  if (!lot || !lotItems || !products) {
    return (
      <Box
        sx={{ padding: "36px 28px", color: foto.ink.tertiary, fontSize: 13 }}
      >
        Cargando resumen del lote {loteId}…
      </Box>
    );
  }

  return (
    <Box sx={{ padding: { xs: "24px 16px", md: "36px 28px" } }}>
      <TicketHeader
        id={lot.loteId}
        meta={[
          { label: "Estado", value: lot.estado },
          { label: "Ítems", value: `${itemsCount} / ${unidades}` },
          { label: "Preponderancia", value: `${prepSum.toFixed(1)}%` },
          { label: "Costo", value: formatCOP(lot.costoTotalCOP) },
        ]}
      />

      <Box
        sx={{ textAlign: "center", margin: "32px auto 28px", maxWidth: 560 }}
      >
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: foto.accent.deep,
            background: foto.accent.soft,
            borderRadius: "999px",
            padding: "6px 12px",
          }}
        >
          <CheckCircle2 size={14} />
          {isClosed ? "Lote cerrado" : "Listo para cerrar"}
        </Box>
        <Box
          component="h1"
          sx={{
            fontSize: { xs: 28, md: 38 },
            fontWeight: 600,
            letterSpacing: "-0.03em",
            marginTop: "16px",
            color: foto.ink.primary,
          }}
        >
          {isClosed ? "Publicar lote" : "Cerrar lote"} {lot.loteId}
        </Box>
        <Box
          sx={{ fontSize: 14, color: foto.ink.secondary, marginTop: "10px" }}
        >
          {isClosed
            ? "Este lote ya está cerrado. Publicá sus ítems para que aparezcan en el catálogo y puedas venderlos."
            : "Revisá las validaciones, decidí qué ítems publicar y confirmá el cierre. Después podrás vender desde el catálogo."}
        </Box>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" },
          gap: "14px",
          marginBottom: "28px",
        }}
      >
        <ValidationCard
          label="Preponderancia (BR-2)"
          ok={br2Ok}
          value={`${prepSum.toFixed(1)}%`}
          detail="Debe sumar 100% ± 0.01"
        />
        <ValidationCard
          label="Conteo (BR-3)"
          ok={br3Ok}
          value={`${itemsCount} / ${unidades}`}
          detail="Ítems capturados = unidades declaradas"
        />
        <ValidationCard
          label="Fotos"
          ok={photosOk}
          value={photosOk ? "Completo" : "Faltan fotos"}
          detail="Recomendado: hero en Drive por ítem"
        />
        <ValidationCard
          label="Sync"
          ok={syncOk}
          value={lot.syncStatus ?? "—"}
          detail="Estado de sincronización con Sheets"
        />
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1.5fr 420px" },
          gap: "32px",
          alignItems: "start",
        }}
      >
        <Box
          sx={{
            background: foto.surfaces.panel,
            border: `1px solid ${foto.surfaces.rule}`,
            borderRadius: "14px",
            padding: "20px 22px",
          }}
        >
          <Box
            component="h2"
            sx={{ fontSize: 17, fontWeight: 600, margin: "0 0 16px" }}
          >
            Ítems del lote
          </Box>
          <Box
            component="ul"
            role="list"
            sx={{ listStyle: "none", m: 0, p: 0 }}
          >
            {lotItems.map((li) => {
              const product = products.find((p) => p.itemId === li.itemId);
              const pubOn = pubByItemId[li.itemId] ?? false;
              const pricing = pricingByItemId[li.itemId] ?? {
                precioEmbajadorCOP: "",
                precioPotencialCOP: "",
                precioConscienteCOP: "",
              };
              return (
                <Box
                  component="li"
                  key={li._id}
                  sx={{
                    display: "grid",
                    gap: "12px",
                    padding: "14px 0",
                    borderBottom: `1px solid ${foto.surfaces.edge}`,
                    "&:last-of-type": { borderBottom: "none" },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "12px",
                      alignItems: "flex-start",
                    }}
                  >
                    <Box>
                      <Box
                        sx={{
                          fontFamily: fontFamilies.mono,
                          fontSize: 11,
                          color: foto.ink.tertiary,
                        }}
                      >
                        #{li.itemId}
                      </Box>
                      <Box sx={{ fontSize: 14, fontWeight: 600 }}>
                        {product?.nombre ?? "—"}
                      </Box>
                      <Box sx={{ fontSize: 12, color: foto.ink.secondary }}>
                        {li.preponderancia}% · {formatCOP(li.costoBaseCOP)}
                      </Box>
                    </Box>
                    <Box
                      component="button"
                      type="button"
                      aria-pressed={pubOn}
                      onClick={() =>
                        setPubByItemId((prev) => ({
                          ...prev,
                          [li.itemId]: !pubOn,
                        }))
                      }
                      sx={{
                        fontFamily: fontFamilies.system,
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "6px 10px",
                        borderRadius: "999px",
                        border: `1px solid ${pubOn ? foto.accent.primary : foto.surfaces.rule}`,
                        background: pubOn
                          ? foto.accent.soft
                          : foto.surfaces.inset,
                        color: pubOn ? foto.accent.deep : foto.ink.secondary,
                        cursor: "pointer",
                      }}
                    >
                      {pubOn ? "Publicar" : "Reserva"}
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: "10px",
                    }}
                  >
                    <Box>
                      <FieldLabel optional="embajador">
                        Precio embajador
                      </FieldLabel>
                      <NumberInputWithCalc
                        value={pricing.precioEmbajadorCOP}
                        onChange={(v) =>
                          setPricingByItemId((prev) => ({
                            ...prev,
                            [li.itemId]: { ...pricing, precioEmbajadorCOP: v },
                          }))
                        }
                        step={1000}
                        min={0}
                        ariaLabel="Precio embajador"
                        calcVariant="neutral"
                      />
                    </Box>
                    <Box>
                      <FieldLabel optional="potencial">
                        Precio potencial
                      </FieldLabel>
                      <NumberInputWithCalc
                        value={pricing.precioPotencialCOP}
                        onChange={(v) =>
                          setPricingByItemId((prev) => ({
                            ...prev,
                            [li.itemId]: { ...pricing, precioPotencialCOP: v },
                          }))
                        }
                        step={1000}
                        min={0}
                        ariaLabel="Precio potencial"
                        calcVariant="neutral"
                      />
                    </Box>
                    <Box>
                      <FieldLabel optional="consciente">
                        Precio consciente
                      </FieldLabel>
                      <NumberInputWithCalc
                        value={pricing.precioConscienteCOP}
                        onChange={(v) =>
                          setPricingByItemId((prev) => ({
                            ...prev,
                            [li.itemId]: { ...pricing, precioConscienteCOP: v },
                          }))
                        }
                        step={1000}
                        min={0}
                        ariaLabel="Precio clientes conscientes"
                        calcVariant="neutral"
                      />
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Box
            sx={{
              background: foto.surfaces.inset,
              border: `1px solid ${foto.surfaces.edge}`,
              borderRadius: "12px",
              padding: "16px 18px",
              fontSize: 12.5,
              color: foto.ink.secondary,
              lineHeight: 1.55,
            }}
          >
            {isClosed ? (
              <>
                Al publicar: todos los ítems pasan a{" "}
                <strong>visibles en catálogo</strong> y el lote queda{" "}
                <strong>publicado</strong>, listo para vender.
              </>
            ) : (
              <>
                Al cerrar: el lote pasa a <strong>cerrado</strong>, se
                sincroniza a Sheets y los ítems en reserva quedan ocultos del
                catálogo hasta que los publiques.
              </>
            )}
          </Box>

          {isClosed ? null : (
            <Box
              sx={{
                background: foto.surfaces.panel,
                border: `1px solid ${foto.surfaces.rule}`,
                borderRadius: "14px",
                padding: "18px 20px",
              }}
            >
              <FieldLabel>Decisión de publicación</FieldLabel>
              <RadioGroup
                aria-label="Decisión de publicación"
                value={publishMode}
                onChange={(e) =>
                  applyPublishMode(e.target.value as PublishMode)
                }
              >
                <FormControlLabel
                  value="all"
                  control={<Radio size="small" />}
                  label="Publicar todo el lote ahora"
                />
                <FormControlLabel
                  value="selective"
                  control={<Radio size="small" />}
                  label="Publicar selectivamente (usa toggles)"
                />
                <FormControlLabel
                  value="reserve"
                  control={<Radio size="small" />}
                  label="Mantener todo en reserva"
                />
              </RadioGroup>
            </Box>
          )}

          <Box
            component="button"
            type="button"
            disabled={(isClosed ? false : !validationsOk) || closing}
            onClick={() =>
              isClosed ? void handlePublishClosed() : void handleClose()
            }
            sx={{
              width: "100%",
              padding: "14px 18px",
              borderRadius: "11px",
              border: "none",
              background: foto.accent.primary,
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: closing ? "wait" : "pointer",
              opacity: (isClosed ? false : !validationsOk) || closing ? 0.6 : 1,
              "&:hover:not(:disabled)": {
                filter: "brightness(1.05)",
              },
            }}
          >
            {closing
              ? isClosed
                ? "Publicando…"
                : "Cerrando…"
              : isClosed
                ? "Publicar lote"
                : "Cerrar lote"}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

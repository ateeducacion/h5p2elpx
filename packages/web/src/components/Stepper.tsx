import { useI18n } from "../i18n/index.tsx";

type StepProps = { n: string; label: string; active: boolean; done: boolean };

function Step({ n, label, active, done }: StepProps) {
  const cls = ["step", active ? "active" : "", done ? "done" : ""].filter(Boolean).join(" ");
  return (
    <li className={cls}>
      <span className="num">
        <span>{n}</span>
      </span>
      <span>{label}</span>
    </li>
  );
}

export type StepperState = {
  hasFiles: boolean;
  hasReport: boolean;
};

export function Stepper({ state }: { state: StepperState }) {
  const { hasFiles, hasReport } = state;
  const { t } = useI18n();
  return (
    <ol className="stepper">
      <Step n="1" label={t("stepper.upload")} active={!hasFiles} done={hasFiles} />
      <Step
        n="2"
        label={t("stepper.review")}
        active={hasFiles && !hasReport}
        done={hasFiles && hasReport}
      />
      <Step n="3" label={t("stepper.configure")} active={hasFiles && !hasReport} done={hasReport} />
      <Step n="4" label={t("stepper.download")} active={hasReport} done={false} />
    </ol>
  );
}

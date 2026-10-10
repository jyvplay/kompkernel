import React, { useState, useCallback } from "react";
import { Card, CardHeader, CardBody } from "@northgate/ui";

export function RetentionPanel({ policies, onSelect, selectedId }) {
  const [filter, setFilter] = useState("");
  const handle = useCallback((id) => () => onSelect(id), [onSelect]);
  return (
    <div className="retention-panel">
      <Card className="retention-card">
        <CardHeader className="retention-header">
          <h3 className="retention-title">Retention policies</h3>
          <input className="retention-filter" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter policies" />
        </CardHeader>
        <CardBody className="retention-body">
          <ul className="policy-list">
            {policies.filter((p) => p.name.includes(filter)).map((p) => (
              <li className="policy-item" key={p.id} onClick={handle(p.id)}>
                <span className="policy-name">{p.name}</span>
                <span className="policy-days">{p.days} days</span>
                <span className="policy-mode">{p.mode}</span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}

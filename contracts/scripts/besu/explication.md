# Upgradear todos
npx hardhat run scripts/upgrade-besu.js --network besu

# Upgradear solo uno
UPGRADE_TARGET=LoanRegistry npx hardhat run scripts/upgrade-besu.js --network besu


Cómo funciona el deploy y el upgrade
La idea central
Cuando usas proxy, en realidad despliegas 2 contratos, no 1:
Tu dirección de siempre (Proxy)
        ↓
  guarda el storage
  delega las llamadas vía delegatecall
        ↓
Contrato de implementación (Logic)
  tiene el código/lógica
  NO tiene el storage
El usuario/backend siempre habla con el Proxy. La dirección del Proxy nunca cambia. Cuando haces upgrade, solo cambias a qué implementación apunta el Proxy.


Deploy inicial
Cuando corres deploy-besu.js:
bashnpx hardhat run scripts/deploy-besu.js --network besu
```

Por dentro, `upgrades.deployProxy()` hace **3 cosas automáticamente**:
```
1. Despliega tu contrato de lógica (LoanRegistry)
        → 0xAAA... (nadie habla con esta dirección directamente)

2. Despliega el Proxy
        → 0xBBB... (esta es la que guardas en .env y usa tu backend)

3. Llama a initialize() a través del Proxy
        → equivale al constructor original
```

Lo que guardas en `.env` es siempre la dirección del **Proxy** (`0xBBB`). Tu backend, frontend, los otros contratos — todos apuntan al Proxy.

---

### Cómo funciona una llamada normal (post-deploy)
```
Tu backend llama readLoan("abc") en 0xBBB (Proxy)
        ↓
El Proxy recibe la llamada
        ↓
Hace delegatecall → 0xAAA (LoanRegistry lógica)
        ↓
La lógica se ejecuta PERO el storage se lee/escribe en el Proxy
        ↓
Respuesta vuelve a tu backend
Esto es clave: el storage vive en el Proxy, la lógica vive en la implementación.

Upgrade
Cuando quieres cambiar algo en un contrato (bug fix, nueva función, etc.):
bashnpx hardhat run scripts/upgrade-besu.js --network besu
```

Lo que hace `upgrades.upgradeProxy()` por dentro:
```
1. Despliega el nuevo contrato de lógica (LoanRegistryV2)
        → 0xCCC... (nueva implementación)

2. Llama a upgradeTo(0xCCC) en el Proxy
        → el Proxy ahora apunta a la nueva lógica

3. El Proxy (0xBBB) sigue siendo la misma dirección
        → tu backend no cambia nada
        → todo el storage (loans, users, etc.) sigue intacto
```
```
ANTES del upgrade:        DESPUÉS del upgrade:
0xBBB → 0xAAA            0xBBB → 0xCCC
(Proxy → V1)             (Proxy → V2, misma data)

Para upgradear un contrato específico
En tu caso por ejemplo si solo cambias LoanRegistry, creas LoanRegistryV2.sol con lo nuevo y corres:
bashUPGRADE_TARGET=LoanRegistry npx hardhat run scripts/upgrade-besu.js --network besu
El script valida automáticamente que el storage sea compatible antes de hacer nada. Si metiste mal una variable nueva (en el orden incorrecto por ejemplo), falla antes de tocar nada en la red.

La regla de oro del storage
Esto es lo más importante a recordar para cuando hagas una V2:
solidity// V1 — original
contract LoanRegistry {
    mapping(string => Loan) private loans;      // slot 0
    mapping(string => string[]) private history; // slot 1
    string[] private allLoanIds;                 // slot 2
}

// V2 — ✅ CORRECTO: solo agregar al final
contract LoanRegistryV2 {
    mapping(string => Loan) private loans;      // slot 0 — igual
    mapping(string => string[]) private history; // slot 1 — igual
    string[] private allLoanIds;                 // slot 2 — igual
    mapping(string => string) public loanTags;   // slot 3 — NUEVO ✅
}

// V2 — ❌ INCORRECTO: cambiar orden rompe todo el storage
contract LoanRegistryV2 {
    mapping(string => string) public loanTags;   // slot 0 — ROMPE loans ❌
    mapping(string => Loan) private loans;       // slot 1 — ROMPE history ❌
    ...
}
```

---

### Flujo completo resumido
```
Primera vez:
  deploy-besu.js → crea Proxy + Implementación V1 → guarda dirección Proxy en .env

Tienes data vieja sin proxy:
  deploy-besu.js → crea contratos nuevos vacíos
  migrate-besu.js → copia la data vieja a los nuevos

Quieres cambiar lógica en el futuro:
  Editas el contrato (o creas V2)
  upgrade-besu.js → nueva implementación, mismo Proxy, misma data, misma dirección
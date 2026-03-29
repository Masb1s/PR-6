function validateHolder(name) {
    if (!/^[A-Za-zА-Яа-яІіЇїЄєҐґ\s-]+$/.test(name)) {
        throw new Error("Ім'я власника може містити лише літери");
    }
}

function validateType(type) {
    const allowed = ["savings", "checking", "credit"];
    if (!allowed.includes(type)) {
        throw new Error("Тип рахунку повинен бути: savings, checking або credit");
    }
}

function formatAccount(acc) {
    return (
        "Акаунт створено:\n" +
        `Номер: ${acc.accountNumber}\n` +
        `Власник: ${acc.holder}\n` +
        `Тип: ${acc.type}\n` +
        `Баланс: ${acc.formattedBalance}\n` +
        `Дата створення: ${acc.createdAt.toLocaleString()}`
    );
}

function createAccount({ accountNumber, holder, type }) {
    let balance = 0;
    let isFrozen = false;
    const createdAt = new Date();
    const transactions = [];

    function recordTransaction(type, amount, meta = {}) {
        const tx = Object.freeze({
            id: crypto.randomUUID(),
            type,
            amount: Number(amount.toFixed(2)),
            date: new Date(),
            meta
        });
        transactions.push(tx);
    }

    function validateAmount(amount) {
        if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
            throw new Error("Невірна сума");
        }
    }

    function ensureActive() {
        if (isFrozen) throw new Error("Рахунок заморожено");
    }

    return {
        accountNumber,
        holder,
        type,
        createdAt,

        deposit(amount) {
            ensureActive();
            validateAmount(amount);
            balance += amount;
            recordTransaction("deposit", amount);
        },

        withdraw(amount) {
            ensureActive();
            validateAmount(amount);
            if (balance < amount) throw new Error("Недостатньо коштів");
            balance -= amount;
            recordTransaction("withdraw", amount);
        },

        transfer(target, amount) {
            ensureActive();
            validateAmount(amount);
            if (balance < amount) throw new Error("Недостатньо коштів");
            balance -= amount;
            target.deposit(amount);
            recordTransaction("transfer", amount, { to: target.accountNumber });
        },

        getBalance() {
            return Number(balance.toFixed(2));
        },

        get formattedBalance() {
            return `${balance.toFixed(2)} UAH`;
        },

        getTransactions() {
            return [...transactions];
        },

        getTransactionsByType(type) {
            return transactions.filter(t => t.type === type);
        },

        getTransactionsByDateRange(start, end) {
            return transactions.filter(t => t.date >= start && t.date <= end);
        },

        freeze() {
            isFrozen = true;
        },

        close() {
            isFrozen = true;
            recordTransaction("closed", 0);
        }
    };
}

function createAccountManager() {
    const accounts = new Map();

    return {
        createAccount(data) {
            validateHolder(data.holder);
            validateType(data.type);

            if (accounts.has(data.accountNumber)) {
                throw new Error("Рахунок вже існує");
            }

            const acc = createAccount(data);
            accounts.set(data.accountNumber, acc);
            return acc;
        },

        getAccount(accountNumber) {
            const acc = accounts.get(accountNumber);
            if (!acc) throw new Error("Рахунок не знайдено");
            return acc;
        },

        getTotalBalance(holder) {
            let sum = 0;
            for (const acc of accounts.values()) {
                if (acc.holder === holder) sum += acc.getBalance();
            }
            return Number(sum.toFixed(2));
        },

        freezeAccount(accountNumber) {
            this.getAccount(accountNumber).freeze();
        },

        closeAccount(accountNumber) {
            this.getAccount(accountNumber).close();
        }
    };
}

const bank = createAccountManager();
const out = document.getElementById("output");

function show(data) {
    out.textContent = typeof data === "string" ? data : JSON.stringify(data, null, 2);
}

function uiCreateAccount() {
    try {
        const acc = bank.createAccount({
            accountNumber: document.getElementById("accNumber").value.trim(),
            holder: document.getElementById("accHolder").value.trim(),
            type: document.getElementById("accType").value.trim()
        });

        show(formatAccount(acc));

    } catch (e) {
        show(e.message);
    }
}

function uiDeposit() {
    try {
        const acc = bank.getAccount(document.getElementById("opAccount").value.trim());
        acc.deposit(Number(document.getElementById("opAmount").value));
        show("Депозит виконано. Баланс: " + acc.formattedBalance);
    } catch (e) {
        show(e.message);
    }
}

function uiWithdraw() {
    try {
        const acc = bank.getAccount(document.getElementById("opAccount").value.trim());
        acc.withdraw(Number(document.getElementById("opAmount").value));
        show("Зняття виконано. Баланс: " + acc.formattedBalance);
    } catch (e) {
        show(e.message);
    }
}

function uiTransfer() {
    try {
        const from = bank.getAccount(document.getElementById("trFrom").value.trim());
        const to = bank.getAccount(document.getElementById("trTo").value.trim());
        const amount = Number(document.getElementById("trAmount").value);
        from.transfer(to, amount);
        show("Переказ виконано. Баланс відправника: " + from.formattedBalance);
    } catch (e) {
        show(e.message);
    }
}

function uiGetBalance() {
    try {
        const acc = bank.getAccount(document.getElementById("balAccount").value.trim());
        show("Баланс: " + acc.formattedBalance);
    } catch (e) {
        show(e.message);
    }
}

function uiGetHistory() {
    try {
        const acc = bank.getAccount(document.getElementById("histAccount").value.trim());
        show(acc.getTransactions());
    } catch (e) {
        show(e.message);
    }
}

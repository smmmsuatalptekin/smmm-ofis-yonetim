"""Credential Vault — simetrik şifreleme (encryption at rest).

Fernet (cryptography) kullanır. Anahtar YALNIZCA environment'tan okunur
(CREDENTIAL_ENCRYPTION_KEY). Anahtar asla loglanmaz, frontend'e gönderilmez.
Çözülen düz metin yalnızca kullanım anında bellekte tutulur.
"""
import os
from cryptography.fernet import Fernet, InvalidToken

_KEY = os.environ.get("CREDENTIAL_ENCRYPTION_KEY", "")
_fernet = None
if _KEY:
    try:
        _fernet = Fernet(_KEY.encode())
    except Exception:
        _fernet = None


def has_key() -> bool:
    return _fernet is not None


def encrypt_secret(value: str) -> str:
    if not _fernet:
        raise RuntimeError("CREDENTIAL_ENCRYPTION_KEY yapılandırılmamış")
    return _fernet.encrypt(value.encode("utf-8")).decode("ascii")


def decrypt_secret(token: str) -> str:
    if not _fernet:
        raise RuntimeError("CREDENTIAL_ENCRYPTION_KEY yapılandırılmamış")
    try:
        return _fernet.decrypt(token.encode("ascii")).decode("utf-8")
    except InvalidToken as exc:
        raise RuntimeError("Kayıtlı bilgi çözülemedi") from exc

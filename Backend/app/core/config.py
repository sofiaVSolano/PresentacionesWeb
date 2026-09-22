from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    cors_origins: str = "http://localhost:5173"

    # ---- Correo del formulario de contacto: Resend ----
    # Camino principal. Va por HTTPS contra api.resend.com, que es lo único que
    # funciona en Render: la plataforma no deja abrir conexiones SMTP salientes
    # y el socket muere con "Network is unreachable".
    resend_api_key: str = ""
    # Remitente, con un dominio verificado en Resend. Formato "Nombre <correo@dominio>"
    # o solo "correo@dominio". Ver README.
    resend_from: str = ""
    resend_timeout: int = 15

    # ---- Correo del formulario de contacto: SMTP (respaldo) ----
    # Lo que se usa en local y lo que sigue sirviendo si Resend falla. Con Gmail
    # hace falta una "contraseña de aplicación" (ver README), no la del correo.
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    # True para el puerto 465 (SSL directo); False para el 587 (STARTTLS)
    smtp_ssl: bool = False
    smtp_timeout: int = 20
    # A dónde llegan los mensajes. Vacío = a la misma cuenta que los envía.
    contact_to: str = ""
    contact_from_name: str = "Portafolio de Sofía"
    # Mensajes que se aceptan por IP en una hora, para que nadie use el
    # formulario como manguera de spam hacia la bandeja de entrada.
    contact_rate_limit: int = 5

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def resend_configured(self) -> bool:
        # Sin destinatario no hay nada que enviar, aunque la clave esté puesta
        return bool(self.resend_api_key and self.resend_from and self.contact_recipient)

    @property
    def smtp_configured(self) -> bool:
        return bool(self.smtp_host and self.smtp_user and self.smtp_password)

    @property
    def email_configured(self) -> bool:
        """Hay al menos un camino de salida: Resend, SMTP o los dos."""
        return self.resend_configured or self.smtp_configured

    @property
    def contact_recipient(self) -> str:
        return self.contact_to or self.smtp_user


settings = Settings()

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    cors_origins: str = "http://localhost:5173"

    # ---- Correo del formulario de contacto ----
    # Los mensajes se envían por SMTP desde la propia cuenta de Sofía. Con Gmail
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
    def smtp_configured(self) -> bool:
        return bool(self.smtp_host and self.smtp_user and self.smtp_password)

    @property
    def contact_recipient(self) -> str:
        return self.contact_to or self.smtp_user


settings = Settings()

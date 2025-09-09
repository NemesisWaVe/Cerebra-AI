# core/database.py

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from config import BASE_DIR

# Define the path for your SQLite database file
DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'cerebra_chat.db')}"

# Create the SQLAlchemy engine
# The 'connect_args' is needed only for SQLite to allow it to be used by multiple threads
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)

# Each instance of the SessionLocal class will be a new database session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# This Base class will be used by our model classes to inherit from
Base = declarative_base()
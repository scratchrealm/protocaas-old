class App:
    def __init__(self, name, *, help: str) -> None:
        self._name = name
        self._help = help
        self._processors = []
    def add_processor(self, processor):
        self._processors.append(processor)
    def run(self):
        ...
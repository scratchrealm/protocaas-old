from protocaas import ProtocaasPluginContext, ProtocaasPlugin
from ...ProtocaasPluginTypes import ProtocaasPluginContext
from .Kilosort2p5ProcessingTool import Kilosort2p5ProcessingTool
from .Kilosort3ProcessingTool import Kilosort3ProcessingTool
from .Mountainsort5ProcessingTool import Mountainsort5ProcessingTool

class SpikeSortingPlugin(ProtocaasPlugin):
    @classmethod
    def initialize(cls, context: ProtocaasPluginContext):
        context.register_processing_tool(Kilosort2p5ProcessingTool)
        context.register_processing_tool(Kilosort3ProcessingTool)
        context.register_processing_tool(Mountainsort5ProcessingTool)
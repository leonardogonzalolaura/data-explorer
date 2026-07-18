use crate::models::Dataset;

pub trait Loader: Send + Sync {
    fn can_handle(&self, path: &str) -> bool;
    fn load(&self, path: &str) -> Result<Dataset, String>;
}

pub struct LoaderService {
    loaders: Vec<Box<dyn Loader>>,
}

impl LoaderService {
    pub fn new() -> Self {
        Self { loaders: Vec::new() }
    }

    pub fn register(&mut self, loader: Box<dyn Loader>) {
        self.loaders.push(loader);
    }

    pub fn load(&self, path: &str) -> Result<Dataset, String> {
        let loader = self
            .loaders
            .iter()
            .find(|l| l.can_handle(path))
            .ok_or_else(|| format!("Formato no soportado: {}", path))?;
        loader.load(path)
    }
}
